---
name: luban-dev
description: Tyou Luban 配表开发专用指导。涉及新增/修改/删除配置表、Excel/Defines、Luban schema、导表、生成二进制配置、配置访问封装、字段变更安全、配置数据校验时必须使用。触发词：Luban、配表、配置表、Excel、Defines、genBin、导表、Tb、Config、配置数据、字段、枚举、Bean。
---

# Tyou Luban 配表指导

本 skill 只处理 Tyou 的 Luban 配表工作。框架与业务参考仍以源码和 `.agents/skills/tyou-dev/references/luban-config.md` 为准。

## 当前项目路径

- 配表源：`Design/config/*.xlsx`
- 表/Bean/Enum 定义：`Design/config/__tables__.xlsx`、`Design/config/__beans__.xlsx`、`Design/config/__enums__.xlsx`
- 内置定义：`Design/tools/Defines/builtin.xml`
- Luban 配置：`Design/tools/luban.conf`
- 导表脚本：`Design/tools/genBin.bat`
- 生成数据：`Client/assets/asset-raw/config/game/*.bin`
- 生成代码：`Client/assets/scripts/proto/config/bin/schema.ts`
- 运行时加载：`Client/assets/ty-framework/module/table/TableModule.ts`

## 必读顺序

1. 先读 `.agents/skills/tyou-dev/references/luban-config.md`。
2. 再查 `Design/tools/genBin.bat`、`Design/tools/Defines/` 和实际配置加载代码。
3. 涉及业务访问方式时，用 `rg "tyou.table"` 和 `rg "Tb"` 查现有调用。

## 快速扫描

处理配表问题前，优先运行只读扫描脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/luban-dev/scripts/scan-luban.ps1
```

扫描只检查路径、源表、生成物和运行时代码线索，不修改文件。

## 操作工具

Tyou 版 Luban helper：

```powershell
python .agents/skills/luban-dev/scripts/luban_helper.py table list
```

工具默认只读；任何写 Excel 的命令必须显式传入 `--write`。写入前先确认源表、字段定义、引用关系和导表验证；删除、重命名、改类型或主键必须按 Deep 说明影响并得到确认。

常用只读命令：

```powershell
python .agents/skills/luban-dev/scripts/luban_helper.py table list
python .agents/skills/luban-dev/scripts/luban_helper.py table get TableFollower
python .agents/skills/luban-dev/scripts/luban_helper.py field list TableFollower
python .agents/skills/luban-dev/scripts/luban_helper.py row query TableFollower --conditions id=1001
python .agents/skills/luban-dev/scripts/luban_helper.py validate --all
python .agents/skills/luban-dev/scripts/luban_helper.py ref TableFollower
```

支持范围：

- `table list/get/add/delete`
- `field list/add/update/delete`
- `row list/query/add/update/delete`
- `enum list/get/add/update/delete`
- `bean list/get/add/update/delete`
- `validate`
- `ref`

写操作只面向 `Design/config/#*.xlsx` 自动导入表；不直接修改生成代码、`.bin` 或导表脚本。

## 执行方式

- 精确数据修正、验证明确且不改变结构：Direct。
- 新表、跨表数据、字段新增或业务访问联动：Planned。
- 删除/重命名字段、修改类型/主键、调整导表流程或生成位置：Deep；先查引用、说明兼容与回滚，并得到开发者确认。

## 操作红线

- 不直接修改 Luban 生成代码和二进制产物，除非明确是重新导表生成结果。
- 删除字段、改字段名、改主键、改类型属于破坏性变更，必须先查引用并请求确认。
- 写入配置数据前先读取现有表结构和引用关系；无法确认引用时停止。
- 导表优先使用项目现有脚本，不手拼新的 Luban 命令。

## 工作模式

### scan

只读确认配表链路是否完整：

- `Design/config/*.xlsx` 是否存在。
- `__tables__.xlsx`、`__beans__.xlsx`、`__enums__.xlsx` 是否存在。
- `genBin.bat`、`luban.conf`、`builtin.xml` 是否存在。
- `schema.ts` 和 `.bin` 是否存在。
- `TableModule.ts` 是否仍按 `config/game` + `BufferAsset` + `Tables` 加载。

### get

只读查看表结构、字段、枚举、Bean 和现有业务引用；不要先写 Excel。

优先使用 `luban_helper.py table get`、`field list`、`row query`。

### ref

修改字段、删除字段、改主键、改类型、改表名之前，必须用 `rg` 查：

- 生成类名、`Tb*` 类名、字段名。
- `tyou.table.getConfig()` 后的访问链。
- 配置表路径、bin 文件名、Bundle 名称。

同时运行 `luban_helper.py ref <Name>` 查生成代码、源表和业务引用。

### apply

只修改源 Excel/定义或明确要求的业务访问封装；生成代码和 `.bin` 只能通过 `Design/tools/genBin.bat` 产生。

使用 `luban_helper.py` 写入时必须传 `--write`，且删除/改名/改类型前先完成 `ref`。

### export

导表只使用：

```bat
Design/tools/genBin.bat
```

导表后检查 `.bin`、`.meta`、`schema.ts` 的变化，并确认没有手工修改生成物。

### validate

验证顺序：

1. 检查导表命令是否成功。
2. 检查生成数据和生成代码是否更新。
3. 检查 `TableModule.ts` 加载路径是否匹配生成数据。
4. 检查业务引用是否仍能通过 `tyou.table.getConfig()` 访问。
5. 必要时运行 TypeScript/Cocos 可接受的项目校验命令。

## 推荐节奏

1. 明确目标：结构变更、数据变更、访问封装，还是导表问题。
2. 查源码和现有配置，确认真实路径与命名。
3. 对删除/重命名/类型变更做引用检查。
4. 修改源表或 schema。
5. 运行现有导表脚本。
6. 验证生成结果和业务访问代码。
7. 记录实际导表与验证结果；可复发坑才写入 `.codex/memory/` Project Knowledge。
