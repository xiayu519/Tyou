import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    analyzeScriptSource,
    enrichGlobalScriptRelations,
} = require('../dist/global-script-analyzer.js');
const { buildDependencyGraph } = require('../dist/dependency-graph.js');
const { filterOverviewRows } = require('../dist/overview-filter.js');

const providerSource = `
declare global { var tyou: Tyou; }
globalThis.tyou = new Tyou();
`;
const consumerSource = `
export class Main {
    start() { tyou.onLoad(); }
}
`;

const providerAnalysis = analyzeScriptSource('Tyou.ts', providerSource);
const consumerAnalysis = analyzeScriptSource('Main.ts', consumerSource);
const shadowedAnalysis = analyzeScriptSource('Local.ts', 'const tyou = createLocal(); tyou.start();');
assert.deepEqual(providerAnalysis.providers, ['tyou']);
assert.ok(consumerAnalysis.identifiers.includes('tyou'));
assert.equal(shadowedAnalysis.identifiers.includes('tyou'), false, '同名局部变量不得误判为全局脚本消费者');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-global-analysis-'));
const providerFile = path.join(tempRoot, 'Tyou.ts');
const consumerFile = path.join(tempRoot, 'Main.ts');
const orphanFile = path.join(tempRoot, 'SDKGlobal.ts');
fs.writeFileSync(providerFile, providerSource, 'utf8');
fs.writeFileSync(consumerFile, consumerSource, 'utf8');
fs.writeFileSync(orphanFile, 'globalThis.sdkGlobal = { ready: true };', 'utf8');

const input = [
    {
        uuid: 'tyou-provider',
        name: 'Tyou.ts',
        url: 'db://assets/scripts/Tyou.ts',
        file: providerFile,
        type: 'cc.Script',
        depends: [],
    },
    {
        uuid: 'main-consumer',
        name: 'Main.ts',
        url: 'db://assets/scripts/Main.ts',
        file: consumerFile,
        type: 'cc.Script',
        depends: [],
    },
    {
        uuid: 'orphan-global',
        name: 'SDKGlobal.ts',
        url: 'db://assets/scripts/SDKGlobal.ts',
        file: orphanFile,
        type: 'cc.Script',
        depends: [],
    },
];

const enriched = await enrichGlobalScriptRelations(input, 2);
assert.equal(enriched.warning, '');
const provider = enriched.assets.find((asset) => asset.uuid === 'tyou-provider');
const consumer = enriched.assets.find((asset) => asset.uuid === 'main-consumer');
const orphan = enriched.assets.find((asset) => asset.uuid === 'orphan-global');
assert.equal(provider.scriptRole, 'global');
assert.equal(orphan.scriptRole, 'global');
assert.ok(consumer.depends.includes('tyou-provider'));

const snapshot = buildDependencyGraph(enriched.assets);
const providerRow = snapshot.rows.find((row) => row.uuid === 'tyou-provider');
const orphanRow = snapshot.rows.find((row) => row.uuid === 'orphan-global');
assert.equal(providerRow.userCount, 1, 'Main.ts 应被补为 Tyou.ts 的直接使用者');
assert.equal(orphanRow.userCount, 0);
assert.ok(
    !filterOverviewRows(snapshot.rows, 'redundant', 'script')
        .some((row) => row.uuid === 'orphan-global'),
    'Global 提供者即使无可证明消费者也不得进入冗余脚本列表',
);

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('global script analyzer tests passed');
