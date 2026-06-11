## Executive Summary

- Change: `optimize-runtime-service-modules`
- Status: archived
- Scope: `Timer/Event/Update` scheduler services and `Storage/GameWorld` state services.
- Guardrails: do not modify resource index loading, Prefab/Scene/meta, Luban generated data, or resource release contracts.
- Validation: OpenSpec and whitespace checks passed; relevant-path TypeScript filter has no output after fixing Event waiter type. Full project TypeScript still fails on pre-existing engine/Luban/editor declaration issues outside this change.

## Change

- Active change: `optimize-runtime-service-modules`
- Schema: `spec-driven`
- Tasks complete: 9/9; change archived to `openspec/changes/archive/2026-06-11-optimize-runtime-service-modules/`.

## Decisions

- Preserve `tyou.timer.addTimer` callback argument semantics: callbacks receive the collected `args` array.
- Use event dispatch depth counters so nested same-type emit flushes removals only at outermost completion.
- Use Update snapshot iteration so additions during update start from a later frame.
- Keep Storage persisted JSON format unchanged and improve read safety around it.
- Normalize GameWorld server timestamp inputs as seconds or milliseconds while preserving `getServerTime()` as seconds.

## Implementation Summary

- `TimerModule`: kept min-heap scheduling, added destroy guard, active diagnostics, pool diagnostics, and safer current-timer reschedule handling.
- `EventModule`: replaced emitting `Set` with depth counters, added `emitArray`, `clear`, waitFor teardown, and deduped pending removals.
- `UpdateModule`: switched to frame snapshots with pending removal/clear flush after update.
- `StorageModule` / `StorageEx`: added safe parse, cache controls, default reads, `has`, and top-level day/week/add helpers while preserving missing-key `null` compatibility.
- `GameWorld`: added seconds/milliseconds normalization, day-boundary event emission, time-scale validation, helper getters, and schedule cleanup.
- Docs/specs: README, Tyou module/event references, and main OpenSpec specs were synchronized.

## Validation Notes

- `cmd /c openspec.cmd validate --all`: passed, 17 items.
- `git diff --check`: no whitespace errors; Git reported CRLF normalization warnings only.
- Relevant-path TypeScript filter for `ty-framework/module/{timer,event,update,storage,world}`: no output after fixing `EventWaiter.callback` type.
- Full `Client` TypeScript compile: failed on existing Cocos Creator declaration, Luban `ByteBuf`, isolatedModules, and editor extension Node type errors outside this change.

## Sensors

- Final sensor run: pass=7, warn=2, fail=0.
- Warnings are expected: validation/archive task state was not fully complete at sensor time, and protected `ty-framework` paths changed under the user-approved framework optimization.

## Risks

- Full project TypeScript may still report known pre-existing Cocos/Luban/editor declaration issues; relevant-path filtering will be used for this change.
- Protected `Client/assets/ty-framework/` files changed, as expected for this user-approved framework module optimization.

## Correction Loop

- Fixed TypeScript relevant-path error in `EventModule`: `EventWaiter.callback` is now typed as `(...args: any[]) => void` for `once()` compatibility.
