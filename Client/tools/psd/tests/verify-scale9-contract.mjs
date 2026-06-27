import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const digestPath = path.resolve(testDir, '../Psd2CCC-Digest.jsx');
const digest = fs.readFileSync(digestPath, 'utf8');
const helperStart = digest.indexOf('function shouldCropScale9Axis');
const helperEnd = digest.indexOf('function cropScale9', helperStart);

assert.ok(helperStart >= 0 && helperEnd > helperStart, '找不到九宫格单轴判断函数');

const helperSource = digest.slice(helperStart, helperEnd);
const shouldCropScale9Axis = new Function(
    `${helperSource}; return shouldCropScale9Axis;`,
)();

assert.equal(shouldCropScale9Axis(100, 0, 0, 2), false, '同轴两端为 0 时保持该轴');
assert.equal(shouldCropScale9Axis(100, 10, 10, 2), true, '正常 inset 应裁切');
assert.equal(shouldCropScale9Axis(100, 0, 10, 2), true, '仅末端 inset 应支持裁切');
assert.equal(shouldCropScale9Axis(100, 10, 0, 2), true, '仅起始端 inset 应支持裁切');
assert.equal(shouldCropScale9Axis(20, 10, 10, 2), false, '目标尺寸不小于原图时不得裁切');

function resolveTargetSize(width, height, border, keep = 2) {
    return {
        width: shouldCropScale9Axis(width, border.left, border.right, keep)
            ? border.left + keep + border.right
            : width,
        height: shouldCropScale9Axis(height, border.top, border.bottom, keep)
            ? border.top + keep + border.bottom
            : height,
    };
}

assert.deepEqual(
    resolveTargetSize(100, 200, { top: 10, bottom: 20, left: 0, right: 0 }),
    { width: 100, height: 32 },
    '左右为 0 时必须保持宽度并只裁高度',
);
assert.deepEqual(
    resolveTargetSize(100, 200, { top: 0, bottom: 0, left: 10, right: 20 }),
    { width: 32, height: 200 },
    '上下为 0 时必须保持高度并只裁宽度',
);
assert.deepEqual(
    resolveTargetSize(100, 200, { top: 10, bottom: 0, left: 20, right: 0 }),
    { width: 22, height: 12 },
    '单侧为 0 时两个启用轴仍应正常裁切',
);
assert.deepEqual(
    resolveTargetSize(100, 200, { top: 0, bottom: 0, left: 0, right: 0 }),
    { width: 100, height: 200 },
    '四个 inset 全为 0 时保持原图尺寸',
);

assert.ok(
    digest.includes('if (s9 && (cropScale9H || cropScale9V))'),
    '外层判断必须允许只裁一个轴',
);
assert.ok(
    digest.includes('if (endInset > 0)'),
    '单边为 0 时不得创建 0 像素末端副本',
);

console.log('Psd2CCC scale9 zero-inset contract verified.');
