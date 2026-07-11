import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    filterOverviewRows,
    getOverviewCounts,
    resolveOverviewRowAction,
} = require('../dist/overview-filter.js');

function row(path, category, userCount) {
    return {
        uuid: path,
        path,
        file: path,
        name: path.split('/').pop(),
        type: category === 'script' ? 'cc.Script' : 'cc.Prefab',
        category,
        dependencyCount: 0,
        userCount,
        dependencies: [],
        users: [],
    };
}

const rows = [
    row('db://assets/ui/Used.prefab', 'resource', 2),
    row('db://assets/ui/Unused.prefab', 'resource', 0),
    row('db://assets/scripts/Used.ts', 'script', 1),
    row('db://assets/scripts/Unused.ts', 'script', 0),
];

assert.deepEqual(getOverviewCounts(rows), {
    references: { resource: 2, script: 2 },
    redundant: { resource: 1, script: 1 },
});
assert.deepEqual(
    filterOverviewRows(rows, 'references', 'resource').map((item) => item.path),
    ['db://assets/ui/Used.prefab', 'db://assets/ui/Unused.prefab'],
);
assert.deepEqual(
    filterOverviewRows(rows, 'references', 'script').map((item) => item.path),
    ['db://assets/scripts/Used.ts', 'db://assets/scripts/Unused.ts'],
);
assert.deepEqual(
    filterOverviewRows(rows, 'redundant', 'resource').map((item) => item.path),
    ['db://assets/ui/Unused.prefab'],
);
assert.deepEqual(
    filterOverviewRows(rows, 'redundant', 'script', 'unused').map((item) => item.path),
    ['db://assets/scripts/Unused.ts'],
);
assert.equal(resolveOverviewRowAction('references', 'detail'), 'detail');
assert.equal(resolveOverviewRowAction('redundant', 'detail'), 'reveal');

console.log('overview filter tests passed');
