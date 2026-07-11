import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let queryCount = 0;
let errorCount = 0;
let warningCount = 0;

globalThis.Editor = {
    Message: {
        async request(channel, message) {
            assert.equal(channel, 'asset-db');
            assert.equal(message, 'query-assets');
            queryCount += 1;
            throw new Error('asset db busy');
        },
    },
};

const originalError = console.error;
const originalWarn = console.warn;
console.error = () => { errorCount += 1; };
console.warn = () => { warningCount += 1; };

try {
    const { DependencyIndexService } = require('../dist/dependency-index-service.js');
    const service = new DependencyIndexService();
    const snapshot = await service.refreshNow();
    assert.equal(snapshot.stale, true);
    assert.match(snapshot.error, /asset db busy/);
    assert.equal(errorCount, 0, '可恢复的 AssetDB 失败不得写入 error 日志');
    assert.equal(warningCount, 1);

    service.scheduleRefresh(0);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(queryCount, 1, '失败冷却期内不得自动连续重试');
    service.dispose();
} finally {
    console.error = originalError;
    console.warn = originalWarn;
}

console.log('refresh failure tests passed');
