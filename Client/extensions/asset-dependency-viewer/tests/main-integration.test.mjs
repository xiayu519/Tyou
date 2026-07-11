import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-dependency-viewer-'));
const cachePath = path.join(tempRoot, 'asset-dependency-viewer', 'dependency-cache.json');
const sentMessages = [];
const selected = [];
const queryAssetsArgs = [];
const profileCalls = [];
let queryAssetsCalls = 0;
let enabledState;
let lastSelectedAsset = '';
let openedBeside = false;
let openedDetail = false;
let focusedAssets = false;

const imageFile = 'D:/project/assets/ui/icon.png';
const assets = [
    {
        uuid: 'ui-folder',
        name: 'ui',
        url: 'db://assets/ui',
        file: 'D:/project/assets/ui',
        type: 'cc.Asset',
        isDirectory: true,
        depends: [],
        dependeds: [],
    },
    {
        uuid: 'image',
        name: 'icon.png',
        url: 'db://assets/ui/icon.png',
        file: imageFile,
        type: 'cc.ImageAsset',
        depends: [],
        dependeds: ['prefab'],
        subAssets: {
            spriteFrame: {
                uuid: 'sprite-frame',
                name: 'spriteFrame',
                url: 'db://assets/ui/icon.png/spriteFrame',
                file: imageFile,
                type: 'cc.SpriteFrame',
            },
        },
    },
    {
        uuid: 'prefab',
        name: 'Widget.prefab',
        url: 'db://assets/ui/Widget.prefab',
        file: 'D:/project/assets/ui/Widget.prefab',
        type: 'cc.Prefab',
        depends: ['sprite-frame'],
        dependeds: [],
    },
];

globalThis.Editor = {
    Project: {
        tmpDir: tempRoot,
        uuid: 'test-project',
    },
    Profile: {
        async getProject(name, key, type) {
            profileCalls.push({ action: 'get', name, key, type });
            return enabledState;
        },
        async setProject(name, key, value, type) {
            profileCalls.push({ action: 'set', name, key, value, type });
            enabledState = value;
        },
    },
    Message: {
        async request(channel, message, ...args) {
            if (channel === 'asset-db' && message === 'query-assets') {
                queryAssetsCalls += 1;
                queryAssetsArgs.push(args);
                await new Promise((resolve) => setTimeout(resolve, 10));
                return assets;
            }
            if (channel === 'asset-db' && message === 'query-asset-info') {
                const identity = args[0];
                return assets.find((asset) => asset.uuid === identity || asset.url === identity) || null;
            }
            throw new Error(`unexpected request: ${channel}/${message}`);
        },
        send(channel, message, payload) {
            sentMessages.push({ channel, message, payload });
        },
    },
    Panel: {
        async openBeside(panel, name) {
            openedBeside = panel === 'assets' && name === 'asset-dependency-viewer.overview';
            return true;
        },
        async open(name) {
            if (name === 'asset-dependency-viewer.detail') openedDetail = true;
            return true;
        },
        async focus(name) {
            focusedAssets = name === 'assets';
            return true;
        },
    },
    Selection: {
        getLastSelected(type) {
            return type === 'asset' ? lastSelectedAsset : '';
        },
        clear() {},
        select(type, uuid) {
            selected.push({ type, uuid });
        },
    },
};

const mainPath = require.resolve('../dist/main.js');
let extension = require(mainPath);
extension.load();

let snapshot = await extension.methods.requestSnapshot();
assert.equal(snapshot.enabled, false);
assert.equal(queryAssetsCalls, 0, '无缓存启动不得查询 AssetDB');

extension.methods.assetDbReady();
await extension.methods.openOverview();
assert.equal(openedBeside, true);
assert.equal(queryAssetsCalls, 0, '打开面板和 ready 广播不得隐式扫描');

snapshot = await extension.methods.enable();
assert.equal(snapshot.enabled, true);
assert.equal(snapshot.assetCount, 2);
assert.equal(queryAssetsCalls, 1);
assert.equal(enabledState, true, '开启状态必须独立写入项目 Profile');
assert.ok(profileCalls.some((call) => call.action === 'set' && call.type === 'project'));
await new Promise((resolve) => setTimeout(resolve, 40));
assert.equal(fs.existsSync(cachePath), true, '开启并成功扫描后必须保存缓存');

const beforeMergedRefresh = queryAssetsCalls;
const first = extension.methods.refresh();
const second = extension.methods.refresh();
await Promise.all([first, second]);
assert.equal(
    queryAssetsCalls,
    beforeMergedRefresh + 2,
    '刷新期间的重复请求应合并为当前刷新加最多一次追加刷新',
);
assert.ok(queryAssetsArgs.every((args) => args.length === 0));
assert.ok(sentMessages.some((item) => item.message === 'snapshot-updated'));

await extension.methods.showDetail('prefab');
assert.equal(openedDetail, true);
const detail = extension.methods.requestDetail();
assert.equal(detail.asset.uuid, 'prefab');
assert.equal(detail.dependencies[0].path, 'db://assets/ui/icon.png');

await extension.methods.revealAsset('image');
assert.equal(focusedAssets, true);
assert.deepEqual(selected.at(-1), { type: 'asset', uuid: 'image' });

assert.equal(await extension.methods.openScope('ui-folder'), true);
assert.equal(extension.methods.requestScope(), 'db://assets/ui');
lastSelectedAsset = 'image';
assert.equal(await extension.methods.useCurrentSelection(), 'db://assets/ui');
assert.equal(extension.methods.setScope('db://assets/ui/'), 'db://assets/ui');
assert.equal(extension.methods.setScope(''), '');

const beforeAssetChange = queryAssetsCalls;
extension.methods.assetDbChanged();
await new Promise((resolve) => setTimeout(resolve, 760));
assert.equal(queryAssetsCalls, beforeAssetChange + 1, '开启状态下资源变化必须刷新');

extension.unload();
assert.equal(fs.existsSync(cachePath), true, '仅卸载或关闭面板不得删除开启缓存');

enabledState = undefined;
delete require.cache[mainPath];
extension = require(mainPath);
extension.load();
snapshot = await extension.methods.requestSnapshot();
assert.equal(snapshot.enabled, true);
assert.equal(snapshot.fromCache, true);
assert.equal(enabledState, true, '旧版本缓存存在时应一次性迁移为独立 Profile 开启状态');
assert.equal(queryAssetsCalls, beforeAssetChange + 1, '缓存恢复不得在 load 阶段全量扫描');

extension.unload();
await new Promise((resolve) => setTimeout(resolve, 40));
fs.rmSync(cachePath, { force: true });
delete require.cache[mainPath];
extension = require(mainPath);
extension.load();
const beforeReadyRecovery = queryAssetsCalls;
snapshot = await extension.methods.requestSnapshot();
assert.equal(snapshot.enabled, true, 'Profile 已开启时即使没有缓存也必须恢复开启状态');
assert.equal(snapshot.revision, 0);
assert.equal(queryAssetsCalls, beforeReadyRecovery, '无缓存恢复应等待 AssetDB ready');
extension.methods.assetDbReady();
await new Promise((resolve) => setTimeout(resolve, 240));
assert.equal(queryAssetsCalls, beforeReadyRecovery + 1, 'AssetDB ready 后必须自动重建缺失缓存');

snapshot = await extension.methods.disable();
assert.equal(snapshot.enabled, false);
assert.equal(enabledState, false, '关闭状态必须独立写入项目 Profile');
assert.equal(fs.existsSync(cachePath), false, '关闭功能必须删除缓存');
const beforeDisabledChange = queryAssetsCalls;
extension.methods.assetDbChanged();
await new Promise((resolve) => setTimeout(resolve, 760));
assert.equal(queryAssetsCalls, beforeDisabledChange, '关闭后资源变化不得创建服务或查询');

extension.unload();
delete require.cache[mainPath];
extension = require(mainPath);
extension.load();
snapshot = await extension.methods.requestSnapshot();
assert.equal(snapshot.enabled, false);
extension.methods.assetDbReady();
await new Promise((resolve) => setTimeout(resolve, 160));
assert.equal(queryAssetsCalls, beforeDisabledChange, '明确关闭后重启仍不得查询 AssetDB');
extension.unload();
fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('main integration tests passed');
