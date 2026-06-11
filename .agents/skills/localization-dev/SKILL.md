---
name: localization-dev
description: Tyou 多语言文案/本地化/i18n 工作流 skill。涉及新增或修改多语言文本、`TableLocalizationText`、`#TableLocalizationText.xlsx`、`tyou.i18n.get`、`LocalizeLabel`、切语言显示、文案 key、中文/英文字段、导表后使用多语言时必须使用。会路由到 `luban-dev` 完成源 Excel 修改和导表，不用于手写字典或直接改生成代码。
---

# Tyou 多语言工作流

本 skill 只负责 Tyou 多语言文案流程。配表读写、字段变更和导表细节必须使用 `luban-dev`。

## 核心路径

1. 读取 `.agents/skills/luban-dev/SKILL.md` 和 `.agents/skills/tyou-dev/references/luban-config.md`。
2. 只改源表：`Design/config/#TableLocalizationText.xlsx`。
3. 当前字段：`id`、`key`、`zh_cn`、`en_us`。
4. 写表前先查重：`key` 必须稳定且唯一，`id` 不重复。
5. 写表前先做文案复用判断，避免重复行。
6. 写表必须通过 `luban-dev` 的安全流程；能用 `luban_helper.py` 就优先用它，写操作必须带 `--write`。
7. 导表只使用 `Design/tools/genBin.bat`。
8. 运行时只通过 `tyou.i18n.get(key, ...args)` 或 `LocalizeLabel` 使用。

## 复用判断

1. 新增文案前先查询 `TableLocalizationText` 现有行，优先用 `luban_helper.py table get TableLocalizationText` 或更窄的 `row query`。
2. 如果已有行的 `zh_cn` 和 `en_us` 与目标文案完全一致，直接复用该行 `id/key`，不新建一模一样的行。
3. 如果已有行语义接近但文本不完全一致，并且候选范围很小、上下文已在手边或 token 成本低，则列出候选 `id/key`、现有文案和差异点，让开发者确认复用旧行还是新建精确文案。
4. 如果表很大、需要大范围语义比较或会明显消耗上下文，只做完全一致判断，并在回复中说明未做语义近似扫描。
5. 语义接近的行未经开发者确认不得擅自复用；完全一致的行可以直接复用。

## 禁止

- 不手写多语言字典作为主路径。
- 不直接修改 `Client/assets/scripts/proto/config/bin/schema.ts`。
- 不手改 `Client/assets/asset-raw/config/game/*.bin`。
- 不直接解析 `.bin` 判断文案内容。
- 不绕过 Luban 源 Excel 补运行时兜底文本。

## 常用操作

只读确认：

```powershell
python .agents/skills/luban-dev/scripts/luban_helper.py table get TableLocalizationText
python .agents/skills/luban-dev/scripts/luban_helper.py field list TableLocalizationText
python .agents/skills/luban-dev/scripts/luban_helper.py row query TableLocalizationText --conditions key=common_ok
```

导表：

```powershell
Design/tools/genBin.bat
```

运行时：

```ts
const text = tyou.i18n.get("common_ok");
const textWithArg = tyou.i18n.get("item_count", count);
```

UI Label：

```ts
labelNode.getComponent(LocalizeLabel)?.setKey("common_ok");
```

## 验证

- 源表存在目标 `key`，且 `zh_cn` / `en_us` 有值。
- 导表成功，生成的 `schema.ts` 与 `game/*.bin` 只作为导表产物变化。
- `TableModule.onCreate()` 后 `tyou.i18n` 可通过 `TbTableLocalizationText` 读取文本。
- 缺 key 时运行时返回 `#key#`，不要用业务代码吞掉这个信号。
