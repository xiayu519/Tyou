## Context

`TableLocalizationText` 已作为 Tyou 多语言源表使用，当前 skill 只要求查重 `key/id`，没有要求按已有 `zh_cn/en_us` 文案复用。新增同义或完全相同文案时，如果总是新建行，会造成表冗余并增加后续维护成本。

`tyou-shader-dev` 的目标已经收敛到 Cocos Creator 3.8.7 小游戏 2D shader/effect。继续把 Unity、ShaderToy、URP 或外部样本路径写进主入口，会误导后续任务把非 Cocos 宿主方案当作默认输入。

## Goals / Non-Goals

**Goals:**

- 在多语言 skill 中加入低成本复用判断，不要求全表高成本语义检索。
- 让 shader skill 主入口、参考文档、spec 和 eval 统一为 Cocos-only 口径。
- 保持已有 Luban 表路径、导表路径、运行时 `tyou.i18n`/`LocalizeLabel` 使用方式不变。

**Non-Goals:**

- 不改现有多语言表数据、Luban 脚本或运行时代码。
- 不实现自动语义向量检索或大规模相似文案扫描。
- 不新增 shader 代码、材质资源或 Cocos asset。

## Decisions

- 多语言完全一致判断以 `zh_cn` 与 `en_us` 两个字段为主；两个字段都相同才直接复用旧 `id/key`。
- 语义近似判断作为可选低成本步骤：只在已读取的相关行、候选范围很小或用户提供明确上下文时执行；发现候选后必须让开发者确认复用还是新建。
- Shader skill 删除迁移参考入口，不再从主 skill 路由到 `porting.md`；参考样本保留 Cocos Effect/Material 结构，不暴露外部项目绝对路径。

## Risks / Trade-offs

- [Risk] 不做高成本语义扫描可能漏掉可复用旧文案。→ Mitigation：skill 明确说明 token 成本高时只做完全一致判断，并在最终说明未做语义近似扫描。
- [Risk] 删除迁移口径后，用户给出非 Cocos shader 参考时触发不如以前宽。→ Mitigation：保持 skill 聚焦项目真实技术栈；非 Cocos 输入按普通参考思路处理，不作为 `tyou-shader-dev` 默认能力承诺。
