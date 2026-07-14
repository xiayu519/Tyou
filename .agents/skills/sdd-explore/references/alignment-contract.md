# Tyou SDD Change Contract

## 路由门槛

### Direct

仅当以下条件全部成立时直接实施：

- 目标、预期行为和验收方式明确。
- 实现沿用现有设计，没有会影响开发者偏好的合理备选。
- 不新增或改变公共 API/schema/事件/持久化格式、用户可见能力、资源生命周期、受保护边界或生成链路语义。
- 修改可逆，目标验证入口明确。

只修正文案、链接、格式或同步已经确定的事实，且不改变规则、路由、契约或运行时语义时，可以 Direct。

文件数量、模块数量和 diff 大小不参与判断。明确机械修改即使涉及很多文件也可以 Direct；单文件修改只要改变公共契约或受保护边界，也必须升级。

### Planned

新功能、用户可见行为、UI/资源/Prefab/Luban/Creator 等跨领域协作、验收语义不明确或存在多种合理方案时使用。写文件前必须给出 Change Contract 并取得明确批准。

### Deep

框架、公共契约、schema/生成规则、破坏性迁移、Codex 工作流语义/任务路由/强制约束/验证契约、受保护边界或高回滚成本时使用。先只读探索；无论请求多明确，写文件前都必须取得对 Change Contract 的明确批准。

## Change Contract

```markdown
## Change Contract

- Goal:
- Non-goals:
- Recommended design:
- Alternatives and trade-offs:
- Allowed changes/contracts:
- Protected boundaries:
- Acceptance:
- Rollback:
- Manual validation:
- Known unknowns:
- Re-alignment conditions:
```

契约应足够让开发者判断颗粒度、方向和允许改变的语义，不写成长篇设计论文。没有内容的字段写“无”，不要虚构备选。实现前无法知道的文件清单不要求预测。

## 确认规则

- Planned/Deep 必须等待明确的“同意、按此做、批准该契约”等答复。
- 用户最初说“实现、直接做”表示授权处理目标，不等于批准模型后来选择的未展示设计和语义边界。
- 开发者在同一请求中已经给出完整或语义等价的契约，并明确要求按该契约实施时，视为已经批准；如果模型补充或改变 Goal、Recommended design、Allowed changes/contracts、Protected boundaries 或 Acceptance，仍须重新确认。
- 当前会话中已经批准同一份 Change Contract 时不重复询问；Goal、Recommended design、Allowed changes/contracts、Protected boundaries 或 Acceptance 改变后重新确认。

## 实施与 review

- 获批后可一次完成所有必要文件，不因文件数量强制分段。
- 只有高回滚风险、可独立验证、方案仍不稳定或开发者明确要求时才分段。
- 实施完成后报告实际文件和 `git diff --stat`，用于 review 与风险说明，不把它们当作事前授权门禁。
- 生成文件可单独列示以便 review；大量生成 diff 必须来自已批准的源输入和生成器，禁止手改生成物掩盖源问题。

## Re-alignment

以下任一情况在扩展语义范围前停止并重新确认：

- 需要新增或改变公共 API/schema/事件/持久化格式。
- 架构方案或关键数据流与获批设计不同。
- 出现新的用户可见行为或改变既有验收语义。
- 需要触碰未批准的受保护模块、资源生命周期或生成链路。
- 回滚、发布、数据迁移或兼容性风险实质上升。
- 验证失败暴露原设计假设错误，需要改变方案而非局部修复。

实际文件比预想多、代码行数增加或 `git diff --stat` 变大，本身都不是 Re-alignment 条件。测试全绿也不能替代语义边界授权。

## 示例

- 单文件空值修复：Direct，无 Change Contract。
- 40 个私有实现文件执行完全明确的机械改名，公共契约和行为不变：Direct，可一次完成。
- 背包 UI + Prefab + 资源加载：Planned，先对齐 UI 结构、资源持有、允许改变的行为和受保护边界。
- 只改一个文件但改变公共资源 API：Deep，仍需先确认。
- 已批准的多模块重构实施时发现必须新增公共 API：发生语义漂移，重新对齐；如果只多触及若干现有私有实现文件，则继续实施。
- 工作流文档 typo、链接修正或确定事实同步：Direct；改变 AGENTS 路由、skill 触发、SDD 门槛或验证契约：Deep。
