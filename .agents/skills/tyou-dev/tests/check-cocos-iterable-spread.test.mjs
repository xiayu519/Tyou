import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../../../..');
const checkerPath = path.join(
    repositoryRoot,
    '.agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs',
);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-iterable-spread-'));

function runChecker(filePath) {
    return spawnSync(process.execPath, [checkerPath, filePath, '--json'], {
        cwd: repositoryRoot,
        encoding: 'utf8',
    });
}

const safePath = path.join(tempRoot, 'safe.ts');
fs.writeFileSync(safePath, `
const array: number[] = [1, 2];
const readonlyArray: readonly number[] = array;
const tuple: readonly [number, string] = [1, 'a'];
const a = [...array];
const b = [...readonlyArray];
const c = [...tuple];
function copy<T extends readonly unknown[]>(value: T) { return [...value]; }
`, 'utf8');

const safeRun = runChecker(safePath);
assert.equal(safeRun.status, 0, safeRun.stderr || safeRun.stdout);
assert.equal(JSON.parse(safeRun.stdout).violations.length, 0);

const unsafePath = path.join(tempRoot, 'unsafe.ts');
fs.writeFileSync(unsafePath, `
const set = new Set<number>();
const map = new Map<string, number>();
const iterable: Iterable<number> = set;
const anyValue: any = set;
const unknownValue: unknown = set;
const text = 'abc';
const a = [...set];
const b = [...map.keys()];
const c = [...map.values()];
const d = [...iterable];
const e = [...anyValue];
const f = [...unknownValue as any];
const g = [...text];
`, 'utf8');

const unsafeRun = runChecker(unsafePath);
assert.equal(unsafeRun.status, 1, unsafeRun.stderr || unsafeRun.stdout);
const unsafeResult = JSON.parse(unsafeRun.stdout);
assert.equal(unsafeResult.violations.length, 7);
assert.ok(unsafeResult.violations.some((item) => item.type.includes('Set')));
assert.ok(unsafeResult.violations.some((item) => item.expression === 'map.keys()'));
assert.ok(unsafeResult.violations.every((item) => item.suggestion.startsWith('Array.from(')));

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('cocos iterable spread checker tests passed');
