# Codex Run Report

## Executive Summary

- Goal: Harden Tyou managed resource ownership, delayed release, and remote SpriteFrame cleanup.
- Current state: validated
- Validation: OpenSpec strict validation, whitespace check, sensor, targeted searches, and filtered TypeScript check completed.
- Remaining risk: Full TypeScript project check still fails on existing Cocos/generated/extension declaration issues unrelated to the changed files.

## Change

- Change: `harden-managed-resource-lifecycle`
- Task level: `L4`
- Date: `2026-06-14`

## Decisions

- Cache maps are reuse indexes, not retained owners: this preserves the Tyou delay window without keeping artificial cache refs alive.
- Framework `decRef` uses `asset.decRef(false)`: Cocos release is triggered only after Tyou observes stable zero-ref delay.
- Pending-load fan-out owns refs per consumer: one underlying Cocos load can safely satisfy multiple callers.
- Remote SpriteFrames track runtime texture/image resources: generated textures are not normal bundle dependencies and need explicit cleanup.
- `loadSpriteFromAtlas` returns caller-owned SpriteFrame: callers no longer need to know that lookup used a temporary atlas owner.

## Validation

| Check | Result | Conclusion |
| --- | --- | --- |
| `cmd /c openspec.cmd validate --all --strict` | pass | 17 passed, 0 failed |
| `git diff --check` | pass | No whitespace errors; Git reported existing CRLF normalization warnings |
| Targeted resource lifecycle searches | pass | No old pending `completes`/shared promise release logic remains; only expected final Cocos release trigger paths remain |
| `cmd /c npx tsc --noEmit` | warn | Full project remains blocked by existing Cocos/generated/extension declaration errors |
| Filtered TypeScript output for changed files | pass | No errors matched `ManagedAssetLoader`, `ReleaseScheduler`, `ResourceModule`, `SpriteAssignService`, or `UIBase` |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | warn | pass=7, warn=2, fail=0; warnings are remaining validation task before final checkbox and protected framework path changes expected for this approved change |

## Risks

- Remaining risks:
  - Runtime behavior still needs Cocos Editor/device verification for GPU memory reclamation of remote SpriteFrames.
- Follow-up:
  - Exercise UI open/close, repeated same-resource UI loads, pending coalesced loads, and remote image release in the editor or target mini-game runtime.

## Correction Loop

- Memory updated: `yes`
- Wiki/docs sync needed: `no`
- OpenSpec archive ready: `yes`
