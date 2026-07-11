import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDependencyGraph } = require('../dist/dependency-graph.js');

const imageFile = 'D:/project/assets/ui/icon.png';
const input = [
    {
        uuid: 'image',
        name: 'icon.png',
        url: 'db://assets/ui/icon.png',
        file: imageFile,
        type: 'cc.ImageAsset',
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
        uuid: 'script',
        name: 'Widget.ts',
        url: 'db://assets/scripts/Widget.ts',
        file: 'D:/project/assets/scripts/Widget.ts',
        type: 'cc.Script',
    },
    {
        uuid: 'prefab',
        name: 'Widget.prefab',
        url: 'db://assets/ui/Widget.prefab',
        file: 'D:/project/assets/ui/Widget.prefab',
        type: 'cc.Prefab',
        depends: ['sprite-frame', 'sprite-frame', 'script'],
    },
    {
        uuid: 'scene',
        name: 'main.scene',
        url: 'db://assets/scenes/main.scene',
        file: 'D:/project/assets/scenes/main.scene',
        type: 'cc.SceneAsset',
        depends: ['prefab'],
    },
    {
        uuid: 'folder',
        name: 'ui',
        url: 'db://assets/ui',
        file: 'D:/project/assets/ui',
        isDirectory: true,
        type: 'cc.Folder',
    },
];

const snapshot = buildDependencyGraph(input, 7, 1234);
const byPath = new Map(snapshot.rows.map((row) => [row.path, row]));

assert.equal(snapshot.revision, 7);
assert.equal(snapshot.assetCount, 4);
assert.equal(snapshot.rawNodeCount, 6);
assert.equal(snapshot.edgeCount, 3);

const prefab = byPath.get('db://assets/ui/Widget.prefab');
assert.ok(prefab);
assert.equal(prefab.dependencyCount, 2);
assert.deepEqual(prefab.dependencies.map((item) => item.path), [
    'db://assets/scripts/Widget.ts',
    'db://assets/ui/icon.png',
]);

const image = byPath.get('db://assets/ui/icon.png');
assert.ok(image);
assert.equal(image.userCount, 1);
assert.equal(image.users[0].path, 'db://assets/ui/Widget.prefab');

const script = byPath.get('db://assets/scripts/Widget.ts');
assert.ok(script);
assert.equal(script.userCount, 1);
assert.equal(script.category, 'script');

assert.equal(image.category, 'resource');

const scene = byPath.get('db://assets/scenes/main.scene');
assert.ok(scene);
assert.equal(scene.dependencyCount, 1);

console.log('dependency-graph tests passed');
