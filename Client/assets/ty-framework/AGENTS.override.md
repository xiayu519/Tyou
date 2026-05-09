# Client/assets/ty-framework/AGENTS.override.md

**当前目录是 Tyou 框架代码，原则上禁止直接修改。**

进入这个目录意味着改动会触及框架本体。任何新增、删除、修改操作必须先：

1. 向开发者说明：为什么必须改框架而不是业务层；
2. 列出影响的模块、调用链、`Tyou.ts` 生命周期注册；
3. 评估失败/回滚成本；
4. 得到开发者明确确认后再动手。

未确认前只允许只读阅读，不允许写文件。

业务功能默认放在 `Client/assets/scripts/` 下，不要扩展 `Client/assets/ty-framework/module/<name>/`。
