import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(testDir, '..');
const projectDir = path.resolve(extensionDir, '../..');
const compiledPath = path.join(extensionDir, 'dist/assets-menu.js');
const localRequire = createRequire(compiledPath);
const compiledSource = `${fs.readFileSync(compiledPath, 'utf8')}
module.exports.__test = { writeSliceBorderToMeta, hasSliceBorder, applySliceBordersToMeta };`;

const calls = [];
let storedMeta = {
    uuid: 'image-uuid',
    subMetas: {
        f9941: {
            importer: 'sprite-frame',
            uuid: 'sprite-uuid',
            userData: {
                borderTop: 50,
                borderBottom: 50,
                borderLeft: 50,
                borderRight: 58,
            },
        },
    },
};

globalThis.Editor = {
    Project: { path: projectDir },
    Message: {
        async request(channel, method, ...args) {
            assert.equal(channel, 'asset-db');
            calls.push(method);
            if (method === 'query-asset-info') return { uuid: 'image-uuid' };
            if (method === 'query-asset-meta') return structuredClone(storedMeta);
            if (method === 'save-asset-meta') {
                assert.equal(args[0], 'image-uuid');
                storedMeta = JSON.parse(args[1]);
                return { uuid: 'image-uuid' };
            }
            if (method === 'reimport-asset') return true;
            throw new Error(`Unexpected AssetDB method: ${method}`);
        },
    },
};

const testModule = new Module(compiledPath);
testModule.filename = compiledPath;
testModule.paths = Module._nodeModulePaths(path.dirname(compiledPath));
testModule.require = localRequire;
testModule._compile(compiledSource, compiledPath);
const api = testModule.exports.__test;
const expected = { top: 100, bottom: 100, left: 100, right: 100 };

const changed = await api.applySliceBordersToMeta(
    'asset-art/atlas/TestPsd',
    { btn_close: expected },
);

assert.deepEqual(changed, ['btn_close']);
assert.equal(api.hasSliceBorder(storedMeta, expected), true);
assert.deepEqual(calls, [
    'query-asset-info',
    'query-asset-meta',
    'save-asset-meta',
    'reimport-asset',
    'query-asset-meta',
]);

Editor.Message.request = async (channel, method) => {
    assert.equal(channel, 'asset-db');
    if (method === 'query-asset-info') return null;
    throw new Error(`Unexpected AssetDB method: ${method}`);
};
await assert.rejects(
    () => api.applySliceBordersToMeta(
        'asset-art/atlas/TestPsd',
        { btn_close: expected },
    ),
    /SpriteFrame 资源尚未导入/,
);

console.log('PSD2CCC slice border AssetDB persistence verified.');
