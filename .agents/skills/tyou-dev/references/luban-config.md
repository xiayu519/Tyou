# Luban 配表

## 目录

- 配表工程：`Design/`
- 数据源：`Design/config/*.xlsx`
- 定义：`Design/tools/Defines/builtin.xml`
- 配置：`Design/tools/luban.conf`
- 生成脚本：`Design/tools/genBin.bat`
- 生成数据：`Client/assets/asset-raw/config/game/*.bin`
- 生成代码：`Client/assets/scripts/proto/config/bin/schema.ts`
- ByteBuf：`Client/assets/scripts/proto/config/luban/ByteBuf.ts`

## 运行时加载

`TableModule.onCreate()`：

1. `tyou.res.loadDirAsync({ path: "game", bundle: "config", type: BufferAsset })`
2. 将每个 bin 放入 `_dataMap`
3. `new Tables((file_name) => new ByteBuf(this._dataMap.get(file_name)))`

业务访问：

```ts
const tables = tyou.table.getConfig();
```

框架文本能力：

- 多语言表由 Luban 生成，运行时通过 `tyou.i18n` 访问，不走手写字典作为主路径。
- `TableModule.onCreate()` 完成 `Tables` 构建后会重载 `tyou.i18n`。

## 导表

优先使用现有脚本：

```bat
Design/tools/genBin.bat
```

脚本目标：

- `-t client`
- `-d bin`
- `-c typescript-bin`
- 输出数据到 `Client/assets/asset-raw/config/game`
- 输出代码到 `Client/assets/scripts/proto/config/bin`

## AI 修改配表规则

- 不手改生成代码 `schema.ts`。
- 不手改生成的 `.bin` 二进制数据。
- 不解析 Luban `.bin` 作为排查主路径；配表问题直接看源 Excel/Defines、导表脚本和生成 TS 访问面。
- 先改 Excel/定义，再运行导表。
- 修改字段要考虑存量数据安全。
- 删除或改名字段风险高，需要先确认引用。
- 导表后检查生成的 `.bin`、`schema.ts` 和 Cocos meta 变化。
- 读取、校验和安全编辑 `Design/config/#*.xlsx` 自动导入表时，优先使用 `.agents/skills/luban-dev/scripts/luban_helper.py`；写操作必须传 `--write` 并先走 OpenSpec。

## 数据错误排查顺序

如果运行时读到的 Luban 数据有错误，无论是逻辑错误、字段缺失、参数没转出来，还是二进制内容看起来不对，AI 必须按下面顺序排查：

1. 先确认是否执行过 `Design/tools/genBin.bat` 导表。
2. 直接读取 `Design/config/*.xlsx` 原始 Excel 数据，确认源数据是否正确。
3. 检查 `__tables__.xlsx`、`__beans__.xlsx`、`__enums__.xlsx` 或 XML 定义是否漏字段、类型或分组。
4. 再检查生成后的 `schema.ts` 和 `.bin` 是否确实未更新；`.bin` 只作为导表产物存在性和时间/差异证据，不做内容解析。
5. 只修改源 Excel/定义文件，然后重新导表。

禁止把生成脚本或二进制数据当成常规修复目标。生成物错误通常是“没有导表”或“源表/定义错误”的结果。

## 规则

配表问题只围绕当前 `Design/` 和 TypeScript 生成链路处理，不引入其他项目的配置表目录或运行时约束。
