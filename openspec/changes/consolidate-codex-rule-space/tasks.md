## 1. 规则目录迁移

- [x] 1.1 将 `.ai/rules/tyou-dev/*.md` 迁移到 `.codex/rules/tyou-dev/*.md`。
- [x] 1.2 删除 `.ai/rules/` 维护入口，确保当前工作流不再依赖该路径。

## 2. Codex 入口与 skill 更新

- [x] 2.1 更新 `AGENTS.md`，把项目入口改为纯 Codex 工作流，并指向 `.codex/rules/`。
- [x] 2.2 更新 `.agents/skills/tyou-dev/SKILL.md` 的规则正文路径、路由表和结束自检。
- [x] 2.3 更新 `.agents/skills/openspec-*` 中的 OpenSpec 规则路径引用。

## 3. 人读文档与规格同步

- [x] 3.1 更新 `README.md` 的 AI 工作流说明。
- [x] 3.2 更新 `Books/AI-Development-Workflow.md` 的结构、路由和同步口径。
- [x] 3.3 更新当前 OpenSpec specs，使 `.codex/rules/` 成为规范化规则源。

## 4. 验证

- [x] 4.1 用搜索确认当前入口、skill、README、Books 和当前 OpenSpec specs 不再把 `.ai/rules/` 作为维护入口。
- [x] 4.2 运行 OpenSpec 状态/校验命令确认 change 可继续 apply 或归档。

## 5. 精简二次收敛

- [x] 5.1 精简 `AGENTS.md`、`README.md`、`Books/AI-Development-Workflow.md`，删除 Codex 自带机制说明和口号式表述。
- [x] 5.2 同步 README workflow spec，要求 README 只保留文件地图和 OpenSpec 边界。
