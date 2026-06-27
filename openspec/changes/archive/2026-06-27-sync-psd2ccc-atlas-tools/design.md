## Context

`Client/extensions/psd2ccc` 当前已有 `common-atlas-checker.ts`，用于层级节点右键“检查公共图集”。该 checker 已负责 PNG 解码指纹、SpriteFrame meta 语义、UUID 引用替换和安全删除判断。来源工程的两个顶部工具入口也是在同一个 checker 上增加计划和面板，不另建算法。

## Goals / Non-Goals

**Goals:**

- 在 `psd2ccc` 扩展中同步顶部 `Tools` 的两个资源治理入口。
- 让全量公共图集整理和冗余图片清理都走 `common-atlas-checker.ts` 的共享逻辑。
- 执行前通过面板展示候选项，并允许用户取消勾选。

**Non-Goals:**

- 不修改 `ty-framework` 或游戏运行时代码。
- 不批量改写现有资源、Prefab、Scene 或 meta。
- 不重写 PSD 导出、UI 生成或公共图集判等规则。

## Decisions

- 复用 `common-atlas-checker.ts` 承载计划构建和执行。这样节点级检查、全量整理、冗余清理只有一份内容指纹和引用安全实现，避免后续维护两套等价逻辑。
- 面板只保存轻量 view model，通过扩展消息调用 checker 执行计划。这样 UI 展示和资源修改职责分离，面板不会直接删除或替换资源。
- `package.json` 使用 Creator 扩展的 `messages`、`menu`、`panels` 注册入口，保持与现有扩展形态一致。

## Risks / Trade-offs

- [Risk] 全量扫描 `assets/asset-art/atlas` 可能较慢 -> 使用编辑器进度反馈，并先展示计划供用户确认。
- [Risk] 冗余清理误删仍被引用的资源 -> 执行前继续使用 checker 的 UUID 引用搜索，发现剩余引用则跳过并报告。
- [Risk] Cocos Creator 3.8.7 面板命名与来源工程包名不同 -> 面板 ID 使用 `psd2ccc.*`，来源中的 `psd2ui.*` 调用同步替换。
