#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../../..');
const clientRoot = path.join(repositoryRoot, 'Client');
const runtimeRoot = path.join(clientRoot, 'assets');
const requireFromClient = createRequire(path.join(clientRoot, 'package.json'));

let ts;
try {
    ts = requireFromClient('typescript');
} catch (error) {
    console.error('无法加载 Client/node_modules/typescript，请先安装 Client npm 依赖。');
    console.error(error?.message || error);
    process.exit(2);
}

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const scanAll = args.includes('--all');
const scanChanged = args.includes('--changed');
const positional = args.filter((arg) => !arg.startsWith('--'));
const supportedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function normalizePath(value) {
    return path.resolve(repositoryRoot, value);
}

function isSupportedFile(filePath) {
    return supportedExtensions.has(path.extname(filePath).toLowerCase()) &&
        !filePath.toLowerCase().endsWith('.d.ts');
}

function collectDirectory(directory, output) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectDirectory(fullPath, output);
        } else if (entry.isFile() && isSupportedFile(fullPath)) {
            output.add(path.resolve(fullPath));
        }
    }
}

function collectExplicitPaths(values, output) {
    for (const value of values) {
        const fullPath = normalizePath(value);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`路径不存在: ${value}`);
        }
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) collectDirectory(fullPath, output);
        else if (stat.isFile() && isSupportedFile(fullPath)) output.add(fullPath);
    }
}

function gitLines(parameters) {
    try {
        const result = execFileSync('git', parameters, {
            cwd: repositoryRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return result.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

function collectChangedFiles(output) {
    const changed = gitLines([
        'diff', '--name-only', '--diff-filter=ACMR', 'HEAD', '--', 'Client/assets',
    ]);
    const untracked = gitLines([
        'ls-files', '--others', '--exclude-standard', '--', 'Client/assets',
    ]);
    for (const relativePath of changed.concat(untracked)) {
        const fullPath = normalizePath(relativePath);
        if (fs.existsSync(fullPath) && isSupportedFile(fullPath)) output.add(fullPath);
    }
}

function loadTsConfig() {
    const configPath = path.join(clientRoot, 'tsconfig.json');
    const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
    if (loaded.error) {
        throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
    }
    return ts.parseJsonConfigFileContent(loaded.config, ts.sys, clientRoot, undefined, configPath);
}

function typeName(type) {
    return type.aliasSymbol?.name || type.getSymbol?.()?.name || '';
}

function isExplicitArrayOrTuple(checker, type, seen = new Set()) {
    if (!type || seen.has(type)) return false;
    seen.add(type);

    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never)) return false;
    if (type.isUnion?.()) {
        return type.types.length > 0 && type.types.every((item) => isExplicitArrayOrTuple(checker, item, seen));
    }
    if (type.isIntersection?.()) {
        return type.types.some((item) => isExplicitArrayOrTuple(checker, item, seen));
    }
    if (checker.isTupleType?.(type) || checker.isArrayType?.(type)) return true;

    const name = typeName(type);
    const targetName = type.target ? typeName(type.target) : '';
    if (name === 'Array' || name === 'ReadonlyArray' || targetName === 'Array' || targetName === 'ReadonlyArray') {
        return true;
    }

    if (type.flags & ts.TypeFlags.TypeParameter) {
        const constraint = checker.getBaseConstraintOfType(type);
        if (constraint && constraint !== type) {
            return isExplicitArrayOrTuple(checker, constraint, seen);
        }
    }
    return false;
}

function relative(filePath) {
    return path.relative(repositoryRoot, filePath).replace(/\\/g, '/');
}

function inspectSourceFile(sourceFile, checker, violations) {
    const visit = (node) => {
        if (ts.isArrayLiteralExpression(node)) {
            for (const element of node.elements) {
                if (!ts.isSpreadElement(element)) continue;
                const expressionType = checker.getTypeAtLocation(element.expression);
                if (isExplicitArrayOrTuple(checker, expressionType)) continue;
                const position = sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile));
                const expression = element.expression.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120);
                violations.push({
                    file: relative(sourceFile.fileName),
                    line: position.line + 1,
                    column: position.character + 1,
                    expression,
                    type: checker.typeToString(expressionType),
                    suggestion: `Array.from(${expression})`,
                });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
}

function printUsage() {
    console.log('用法:');
    console.log('  node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs <file-or-directory> [...]');
    console.log('  node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs --changed');
    console.log('  node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs --all');
}

async function main() {
    if (!scanAll && !scanChanged && positional.length === 0) {
        printUsage();
        process.exitCode = 2;
        return;
    }

    const targets = new Set();
    if (scanAll) collectDirectory(runtimeRoot, targets);
    if (scanChanged) collectChangedFiles(targets);
    collectExplicitPaths(positional, targets);

    const config = loadTsConfig();
    const rootNames = Array.from(new Set(config.fileNames.concat(Array.from(targets))));
    const program = ts.createProgram({ rootNames, options: config.options });
    const checker = program.getTypeChecker();
    const violations = [];

    for (const target of targets) {
        const sourceFile = program.getSourceFile(target);
        if (sourceFile) inspectSourceFile(sourceFile, checker, violations);
    }

    const result = {
        checkedFiles: targets.size,
        violations,
    };
    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`Cocos iterable spread check: ${targets.size} file(s)`);
        for (const violation of violations) {
            console.log(`[FAIL] ${violation.file}:${violation.line}:${violation.column} 非数组 iterable 展开，类型: ${violation.type}`);
            console.log(`       [...${violation.expression}] -> ${violation.suggestion}`);
        }
        console.log(`Summary: violations=${violations.length}`);
    }
    if (violations.length > 0) process.exitCode = 1;
}

main().catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 2;
});
