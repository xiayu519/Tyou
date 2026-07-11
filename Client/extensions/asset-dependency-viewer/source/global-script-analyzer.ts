import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { RawAssetInfo } from './types';

export type ScriptSourceAnalysis = {
    providers: string[];
    identifiers: string[];
};

export type GlobalScriptAnalysisResult = {
    assets: RawAssetInfo[];
    warning: string;
};

type CachedAnalysis = {
    mtimeMs: number;
    analysis: ScriptSourceAnalysis;
};

const cache = new Map<string, CachedAnalysis>();

function unwrapExpression(node: ts.Expression): ts.Expression {
    let current = node;
    while (
        ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isTypeAssertionExpression(current) ||
        ts.isNonNullExpression(current)
    ) {
        current = current.expression;
    }
    return current;
}

function globalMemberName(node: ts.Expression): string | null {
    const current = unwrapExpression(node);
    if (ts.isPropertyAccessExpression(current)) {
        const expression = unwrapExpression(current.expression);
        if (ts.isIdentifier(expression) && expression.text === 'globalThis') {
            return current.name.text;
        }
    }
    if (ts.isElementAccessExpression(current)) {
        const expression = unwrapExpression(current.expression);
        const argument = current.argumentExpression;
        if (
            ts.isIdentifier(expression) && expression.text === 'globalThis' &&
            argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
        ) {
            return argument.text;
        }
    }
    return null;
}

function isAssignment(node: ts.Node): node is ts.BinaryExpression {
    return ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}

function isDeclarationName(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (!parent) return false;
    if ((parent as any).name !== node) return false;
    return ts.isVariableDeclaration(parent) ||
        ts.isParameter(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isFunctionExpression(parent) ||
        ts.isClassDeclaration(parent) ||
        ts.isClassExpression(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodSignature(parent) ||
        ts.isInterfaceDeclaration(parent) ||
        ts.isTypeAliasDeclaration(parent) ||
        ts.isEnumDeclaration(parent) ||
        ts.isImportClause(parent) ||
        ts.isImportSpecifier(parent) ||
        ts.isNamespaceImport(parent) ||
        ts.isBindingElement(parent);
}

export function analyzeScriptSource(filePath: string, source: string): ScriptSourceAnalysis {
    const extension = path.extname(filePath).toLocaleLowerCase();
    const kind = extension === '.js' || extension === '.mjs' || extension === '.cjs'
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
    const providers = new Set<string>();
    const identifiers = new Set<string>();
    const declaredIdentifiers = new Set<string>();

    const visit = (node: ts.Node) => {
        if (isAssignment(node)) {
            const provider = globalMemberName(node.left);
            if (provider) providers.add(provider);
        }

        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            const member = globalMemberName(node);
            const assignmentTarget = isAssignment(node.parent) && node.parent.left === node;
            if (member && !assignmentTarget) identifiers.add(member);
        }

        if (ts.isIdentifier(node)) {
            const parent = node.parent;
            const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node;
            if (isDeclarationName(node)) declaredIdentifiers.add(node.text);
            if (
                node.text !== 'globalThis' &&
                !isPropertyName &&
                !isDeclarationName(node)
            ) {
                identifiers.add(node.text);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    return {
        providers: Array.from(providers).sort(),
        identifiers: Array.from(identifiers)
            .filter((identifier) => !declaredIdentifiers.has(identifier))
            .sort(),
    };
}

async function analyzeFile(filePath: string): Promise<ScriptSourceAnalysis> {
    const stat = await fs.promises.stat(filePath);
    const cached = cache.get(filePath);
    if (cached?.mtimeMs === stat.mtimeMs) return cached.analysis;
    const source = await fs.promises.readFile(filePath, 'utf8');
    const analysis = analyzeScriptSource(filePath, source);
    cache.set(filePath, { mtimeMs: stat.mtimeMs, analysis });
    return analysis;
}

function isScriptAsset(asset: RawAssetInfo): boolean {
    const type = `${asset.type || ''} ${asset.importer || ''}`.toLocaleLowerCase();
    const url = String(asset.url || asset.source || '');
    return type.includes('script') || type.includes('typescript') ||
        type.includes('javascript') || /\.(?:ts|js|mjs|cjs)$/i.test(url);
}

export async function enrichGlobalScriptRelations(
    input: RawAssetInfo[],
    concurrency = 6,
): Promise<GlobalScriptAnalysisResult> {
    const scripts = input.filter((asset) => asset.uuid && asset.file && !asset.isDirectory && isScriptAsset(asset));
    const analyses = new Map<string, ScriptSourceAnalysis>();
    let cursor = 0;
    let failed = 0;

    const worker = async () => {
        while (cursor < scripts.length) {
            const asset = scripts[cursor++];
            try {
                analyses.set(asset.uuid, await analyzeFile(asset.file!));
            } catch {
                failed += 1;
            }
        }
    };
    const workerCount = Math.max(1, Math.min(concurrency, scripts.length || 1));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const providers = new Map<string, Set<string>>();
    for (const asset of scripts) {
        const analysis = analyses.get(asset.uuid);
        for (const name of analysis?.providers || []) {
            let uuids = providers.get(name);
            if (!uuids) {
                uuids = new Set<string>();
                providers.set(name, uuids);
            }
            uuids.add(asset.uuid);
        }
    }

    const output = input.map((asset) => {
        const analysis = analyses.get(asset.uuid);
        if (!analysis) return asset;
        const depends = new Set(asset.depends || []);
        for (const identifier of analysis.identifiers) {
            for (const providerUuid of providers.get(identifier) || []) {
                if (providerUuid !== asset.uuid) depends.add(providerUuid);
            }
        }
        return {
            ...asset,
            depends: Array.from(depends),
            scriptRole: analysis.providers.length > 0 ? 'global' as const : 'normal' as const,
        };
    });

    return {
        assets: output,
        warning: failed > 0 ? `${failed} 个脚本无法完成 Global 引用分析` : '',
    };
}
