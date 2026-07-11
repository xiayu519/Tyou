# Cocos TypeScript 代码规范

本参考约束 `Client/assets/` 下的 Cocos 运行时代码。规则对编辑器预览、原生、Web、小游戏等所有运行平台和构建目标始终生效。

## 禁止非数组 iterable 展开

非明确数组类型的 iterable 禁止使用数组字面量展开。这是日常代码规范，不需要等到 Web 打包或出现兼容问题后才执行。

禁止：

```ts
const a = [...set];
const b = [...map.keys()];
const c = [...map.values()];
const d = [...iterable];
```

必须改为：

```ts
const a = Array.from(set);
const b = Array.from(map.keys());
const c = Array.from(map.values());
const d = Array.from(iterable);
```

需要避免临时数组时使用显式循环：

```ts
const output: Item[] = [];
for (const item of iterable) {
    output.push(item);
}
```

只有 TypeScript 类型明确为以下类型时，才允许数组展开：

- `T[]`
- `readonly T[]`
- tuple 或 readonly tuple
- 泛型约束能够证明为上述数组类型

`any`、`unknown`、`Iterable<T>`、`Set<T>`、`Map` 迭代器、字符串和无法证明为数组的联合类型均不允许直接展开。

## Codex 修改流程

修改或生成 Cocos 运行时 TypeScript 后，对 Codex 本次实际改动的文件显式运行：

```powershell
node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs Client/assets/scripts/A.ts Client/assets/scripts/B.ts
```

辅助模式：

```powershell
node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs --changed
node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs --all
```

检查器只读，不自动改代码。日常验收优先显式传入本次改动文件，避免把无关脏改动混入当前任务。

## Web 构建关系

Cocos Web 发布构建可能把非数组 iterable 展开错误降级为类似 `[].concat(iterable)`，这是制定本规范的重要原因之一，但不是规范的适用范围。

- 普通平台无关任务：执行代码规范和静态检查即可，不因本规则额外要求构建 Web。
- Web 构建差异、发布回归或转换链路专项任务：除静态检查外，再检查最终 Web 构建产物或运行 Web 包覆盖相关路径。

## 受保护路径

检查器全量审计可能命中 `Client/assets/ty-framework/`。该目录仍受 `AGENTS.override.md` 保护；未获得开发者明确授权时只报告问题，不直接修改框架代码，也不得为让检查通过而添加永久忽略。
