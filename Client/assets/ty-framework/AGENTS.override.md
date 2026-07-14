# Client/assets/ty-framework/AGENTS.override.md

**当前目录是 Tyou 框架本体，默认只读。**

任何新增、删除或修改都按 Deep 方式处理。写文件前必须：

1. 说明为什么不能在 `Client/assets/scripts/` 业务层解决；
2. 列出受影响模块、调用链和 `Tyou.ts` 生命周期注册；
3. 评估公共 API、存档/网络兼容、失败和回滚成本；
4. 给出目标测试或构建验证；
5. 获得开发者明确确认。

未确认前只允许只读探索。业务功能默认放在 `Client/assets/scripts/`，不要为单一业务扩展 `Client/assets/ty-framework/module/<name>/`。
