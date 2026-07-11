import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    filterRowsByScope,
    getScopeForAssetInfo,
    normalizeScopePath,
} = require('../dist/scope-utils.js');
const { filterOverviewRows, getOverviewCounts } = require('../dist/overview-filter.js');

function row(assetPath, category = 'resource', userCount = 0) {
    return {
        uuid: assetPath,
        path: assetPath,
        file: assetPath,
        name: assetPath.split('/').pop(),
        type: category === 'script' ? 'cc.Script' : 'cc.ImageAsset',
        category,
        dependencyCount: 0,
        userCount,
        dependencies: [],
        users: [],
    };
}

const rows = [
    row('db://assets/art/common/icon.png', 'resource', 1),
    row('db://assets/art/common/sub/button.png'),
    row('db://assets/art/other/banner.png'),
    row('db://assets/scripts/Main.ts', 'script'),
];

assert.equal(normalizeScopePath('db://assets/'), '');
assert.equal(normalizeScopePath('db://assets/art/common/'), 'db://assets/art/common');
assert.equal(
    getScopeForAssetInfo({ url: 'db://assets/art/common', isDirectory: true }),
    'db://assets/art/common',
);
assert.equal(
    getScopeForAssetInfo({ url: 'db://assets/art/common/icon.png', isDirectory: false }),
    'db://assets/art/common',
);
assert.equal(
    getScopeForAssetInfo({ url: 'db://assets/root.png', isDirectory: false }),
    '',
);

const scoped = filterRowsByScope(rows, 'db://assets/art/common');
assert.deepEqual(scoped.map((item) => item.path), [
    'db://assets/art/common/icon.png',
    'db://assets/art/common/sub/button.png',
]);
assert.equal(filterRowsByScope(rows, '').length, rows.length);
assert.deepEqual(getOverviewCounts(scoped), {
    references: { resource: 2, script: 0 },
    redundant: { resource: 1, script: 0 },
});
assert.deepEqual(
    filterOverviewRows(scoped, 'redundant', 'resource', 'button').map((item) => item.path),
    ['db://assets/art/common/sub/button.png'],
);

console.log('scope utils tests passed');
