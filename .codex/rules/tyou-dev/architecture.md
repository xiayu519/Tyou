# 架构与启动

## 目录

- `Client/`：Cocos Creator 3.8.7 项目。
- `Client/assets/ty-framework/`：框架运行时代码。
- `Client/assets/scripts/`：业务逻辑入口与示例 UI。
- `Client/assets/asset-raw/`：运行时 bundle 资源。
- `Client/assets/asset-art/`：美术和 PSD/图集资源。
- `Client/assets/editor/`：编辑器扩展配置。
- `Client/extensions/`：Cocos Creator 编辑器扩展。
- `Design/`：Luban 配表工程。

## 运行时入口

`Client/assets/scripts/Main.ts`

1. `onLoad()` 调用 `tyou.onLoad()`。
2. `start()` 调用 `await tyou.onCreate()`。
3. 设置 `UICanvas` 和根节点为常驻节点。
4. 后台加载 bundle 和预加载资源。
5. `appStart()` 播放 BGM、加载配置表、切场景、打开 UI。
6. `update()` 调用 `tyou.onUpdate(deltaTime)`。
7. `onDestroy()` 调用 `tyou.onDestroy()`。

## 框架入口

`Client/assets/ty-framework/Tyou.ts`

- 初始化全局 `globalThis.tyou = new Tyou()`。
- 基础模块先实例化：`res/event/timer/fsm/storage/http/ecs/update`。
- 依赖其他模块的后加载模块在 `onLoad()` 创建：`pool/audio/scene/ui/table/game`。

## 依赖方向

业务代码依赖 `ty-framework`，不要让框架核心反向依赖业务目录。

新增模块不要默认放入 `Client/assets/ty-framework/module/<name>/`，也不要默认修改 `Tyou.ts`。`ty-framework` 是框架层，原则上不允许修改；确需扩展框架时，必须先向开发者说明影响并等待确认。

## 框架保护

任何涉及 `Client/assets/ty-framework/` 的新增、删除、修改，都按框架变更处理：

1. 先说明必要性。
2. 说明影响范围和后果。
3. 等开发者确认。
4. 再实施。
