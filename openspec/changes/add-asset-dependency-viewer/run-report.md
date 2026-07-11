# Codex Run Report

## Executive Summary

- Goal: 为 Cocos Creator 3.8.7 提供显式启停、低卡顿的资源/脚本直接引用与冗余查看器。
- Current state: implementation complete, awaiting Creator reload verification.
- Validation: TypeScript 构建、依赖图、两级分类、目录范围、Global 脚本补边、Profile 状态恢复、缓存生命周期、慢查询/超时和主入口集成测试均通过。
- Remaining risk: Creator 真实环境需重载扩展，确认 Assets 右键菜单、项目级 Profile 和面板布局与本地 3.8.7 补丁版本一致。

## Change

- Change: `add-asset-dependency-viewer`
- Task level: `L3`
- Date: `2026-07-11`

## Decisions

- 不注入 Creator 内置 Assets DOM；使用公开 Assets 右键菜单和独立 dockable panel，规避版本升级、虚拟列表失效和编辑器崩溃风险。
- 功能默认关闭；项目级 `Editor.Profile` 独立保存 enabled 状态，快照缓存只负责加速数据恢复；旧版本已有缓存会一次性迁移为 Profile 开启状态。
- 已开启且无缓存时，重启后先恢复 enabled，等待 AssetDB ready 再重建索引；明确关闭后停止服务、忽略资源广播并删除缓存。
- `globalThis.xxx` 提供者与其他脚本对 `xxx` 的直接标识符使用通过 TypeScript AST 补边；局部同名声明不计为全局消费者。
- Global 提供者显示 `Global` 标记，即使没有可证明消费者也不进入冗余脚本列表。
- 总览不再要求翻阅全项目平铺列表：Assets 文件夹右键可直接限定目录，面板也可使用当前 Assets 选择、点击面包屑切换父目录或清除范围。
- 目录范围只限制候选行；每一行的引用数和被引用数仍保留全项目真实直接关系，因此可判断该目录图片是否被目录外资源使用。

## Validation

| Check | Result | Conclusion |
| --- | --- | --- |
| `npm test` | pass | 构建与 7 组回归测试通过 |
| Profile 生命周期集成测试 | pass | 旧缓存状态迁移、开启/关闭独立持久化、有状态无缓存 ready 后重建、关闭重启零查询均通过 |
| Global AST 测试 | pass | `Main.ts -> Tyou.ts` 补边、Global 冗余保护和局部同名排除通过 |
| 真实 `Tyou.ts/Main.ts` 静态验证 | pass | `Tyou.ts` 识别 provider `tyou`，`Main.ts` 识别直接使用 `tyou` |
| 目录范围测试 | pass | 文件夹自身、文件父目录、子树过滤、范围内分类/冗余/搜索通过 |
| `npm pack --dry-run` | pass | 扩展 package 包含 main、Assets 菜单、两个 panel 与新增分析模块 |
| `git diff --check` | pass | 无空白错误 |
| Creator 3.8.7 人工重载 | pending | 需要开发者重载当前扩展后验证真实 UI 和菜单 |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | pass | 9 项检查全部通过，tasks 为 23/23，受保护路径无改动 |

## Risks

- TypeScript AST 只处理静态可证明的 `globalThis.xxx` 和直接标识符，不推断字符串反射、`eval`、配置字段或动态属性名。
- 脚本读取只在功能开启后的刷新阶段执行，使用异步 IO、并发上限 6 和 mtime 缓存；首次开启大型项目仍会有一次脚本分析成本。
- Creator 没有公开 Assets 行装饰 API，因此无法在内置资源树每一行原位画红绿数字；当前目录右键范围是稳定迂回方案。

## Correction Loop

- Memory updated: `yes`，沿用 `editor-analysis-tools-must-be-opt-in.md`。
- Wiki/docs sync needed: `no`，本次未改变 Tyou 运行时或公共开发工作流。
- Protected path changes: `no`，未修改 `Client/assets/ty-framework/`。
- OpenSpec archive ready: `no`，等待 Creator 重载实测后再决定归档。
