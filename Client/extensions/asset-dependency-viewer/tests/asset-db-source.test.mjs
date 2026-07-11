import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadAssetDbGraph } = require('../dist/asset-db-source.js');

const queryArgs = [];
let mode = 'slow-success';
globalThis.Editor = {
    Message: {
        request(channel, message, ...args) {
            assert.equal(channel, 'asset-db');
            assert.equal(message, 'query-assets');
            queryArgs.push(args);
            if (mode === 'timeout') return new Promise(() => {});
            return new Promise((resolve) => setTimeout(() => resolve([
                {
                    uuid: 'prefab',
                    name: 'Demo.prefab',
                    url: 'db://assets/Demo.prefab',
                    file: 'D:/project/assets/Demo.prefab',
                    type: 'cc.Prefab',
                    depends: [],
                    dependeds: [],
                },
            ]), 25));
        },
    },
};

const result = await loadAssetDbGraph(100, 50, 1);
assert.equal(result.assets.length, 1);
assert.deepEqual(queryArgs[0], [], 'query-assets 必须使用 Creator 3.8.7 官方示例的无参数形态');

mode = 'timeout';
await assert.rejects(
    () => loadAssetDbGraph(20, 20, 1),
    /查询项目资源 超时（20ms）/,
);
assert.deepEqual(queryArgs[1], []);

console.log('asset-db source tests passed');
