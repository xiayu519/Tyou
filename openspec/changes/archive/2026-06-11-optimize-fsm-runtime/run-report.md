# Codex Run Report

## Executive Summary

- Goal: `优化 FSM 运行时的异步切换、生命周期清理、遍历安全和易用 API`
- Current state: `archived-ready`
- Validation: `OpenSpec 全量通过；FSM 相关 TS 路径无报错；完整 tsc 仍有既有 Cocos/生成代码/扩展类型错误`
- Remaining risk: `完整 tsc 受既有外部声明和项目旧类型问题阻塞，需继续使用相关路径过滤判断本次改动`

## Change

- Change: `optimize-fsm-runtime`
- Task level: `L3`
- Date: `2026-06-11`

## Decisions

- `Serialize per-FSM transitions`: `同一个 FSM 内按调用顺序执行异步状态切换，避免 onExit/onEnter 交叠`
- `Version stale async work`: `reset/destroy 递增版本号，使旧等待和 queued transition 无法写回状态`
- `Keep sync ergonomics`: `保留 reset/destroy 同步入口，同时提供 resetAsync 等可等待入口`

## Validation

| Check | Result | Conclusion |
| --- | --- | --- |
| `cmd /c openspec.cmd validate --all` | `pass` | `15 passed, 0 failed` |
| static FSM cleanup search | `pass` | `FSMModule.ts` 无 `Unitask`、废弃 `StateMachineWrapper` 和旧并发等待实现残留 |
| relevant-path TypeScript filter | `pass` | `FSMModule.ts` 和 `Tyou.ts` 无相关报错输出 |
| `Client/node_modules/.bin/tsc.cmd --noEmit --project Client/tsconfig.json` | `warn` | 完整编译仍失败在既有 Cocos engine declarations、Luban `ByteBuf`、扩展 Node 类型和 isolatedModules 问题 |
| `git diff --check` | `pass` | 无空白错误，仅有工作区 CRLF 提示 |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | `warn` | `pass=7 warn=2 fail=0`；warn 为仅剩归档任务未勾选和受保护 `ty-framework` 改动，后者已由开发者授权本轮框架优化 |

## Risks

- Remaining risks:
  - `完整 tsc 仍被既有外部/生成代码类型问题阻塞；本次相关路径过滤未发现新增报错`
- Follow-up:
  - `无`

## Correction Loop

- Memory updated: `no`
- Wiki/docs sync needed: `yes, completed in README and .agents/skills/tyou-dev/references`
- OpenSpec archive ready: `yes`
