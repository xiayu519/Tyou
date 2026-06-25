## Why

当前 `m_list` 虽然在生成脚本和运行时绑定中被当作 `ListView`，但 PSD 生成后的前缀检查只保证 `ScrollView`，没有把无限列表结构、`m_item` 模板、item 脚本和资源生命周期串成可直接使用的链路。列表 item 会频繁复用，若异步图片加载和释放仍依赖窗口级资源集合，容易出现旧请求覆盖新 index、资源长期持有或泄漏风险。

## What Changes

- 引入通用 `UIWidget` 概念，作为 `UIWindow` 下的可复用子 UI 单元；它不只服务于列表 item，也可用于 UI 子窗口、页签、子面板等组合式 UI。
- 将 `m_list` 明确绑定为 Tyou 无限/虚拟列表组件，并在前缀检查时自动补齐可运行的 `ListView` 所需组件与标准节点结构。
- 新增 `m_item` 作为 `UIWidget`/列表模板边界；父 UI 生成时收集 `m_list`，但跳过 `m_item` 内部子树，`m_item` 自己生成独立 item/widget 脚本。
- `m_list` 下必须存在且只能使用服务于当前列表的标准 `m_item` 模板；前缀检查应在缺失时报错，在不是实例结构时转换为标准实例结构。
- item/widget 脚本生成到 `Client/assets/scripts/logic/ui/widget/`，目录不存在时由生成器创建。
- 列表 item 支持 item 级动态资源容器，复用、回收、销毁时释放当前 item 动态资源；异步贴图必须防止旧 index 请求覆盖新 index。
- 保持现有 `UIWindow`、`UIBase`、`m_btn`、`m_img`、`m_scroll`、`renderEvent` 等用法兼容。

## Capabilities

### New Capabilities
- `psd-ui-list-generation`: 约束 PSD 到 UI 后处理、前缀检查、`m_list + m_item` 标准结构转换、以及 UI/item 脚本生成路径。

### Modified Capabilities
- `runtime-ui-lifecycle`: 增加通用 `UIWidget` 生命周期、父 UI 绑定边界、`ListView`/`ListItem` 复用生命周期和结构要求。
- `runtime-resource-safety`: 增加列表 item/widget 级动态资源持有、异步贴图防旧请求覆盖、复用/回收/销毁释放契约。

## Impact

- Runtime UI:
  - `Client/assets/ty-framework/module/ui/*`
  - `Client/assets/ty-framework/core/util/ViewUtil.ts`
  - `Client/assets/ty-framework/module/ui/loop-list/ListView.ts`
  - `Client/assets/ty-framework/module/ui/loop-list/ListItem.ts`
- Resource lifecycle:
  - `Client/assets/ty-framework/module/loader/SpriteAssignService.ts`
  - `Client/assets/ty-framework/module/loader/ResourceModule.ts`
  - UI/widget dynamic resource helper paths
- Editor workflow:
  - `Client/extensions/uitscreate/`
  - `Client/extensions/psd2ccc/`
  - `Client/assets/editor/ui-component-config.json`
  - `Client/assets/editor/ui-template.txt`
- Generated business scripts:
  - `Client/assets/scripts/logic/ui/*.ts`
  - `Client/assets/scripts/logic/ui/widget/*.ts`
- Documentation and specs:
  - `.agents/skills/tyou-dev/references/ui-patterns.md`
  - `.agents/skills/tyou-dev/references/psd2ui-workflow.md`
  - `.agents/skills/tyou-dev/references/resource-api.md`
  - `.agents/skills/tyou-dev/references/naming-rules.md`
  - `openspec/specs/runtime-ui-lifecycle/spec.md`
  - `openspec/specs/runtime-resource-safety/spec.md`
