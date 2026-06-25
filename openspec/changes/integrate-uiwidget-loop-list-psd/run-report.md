# Codex Run Report

## Executive Summary

- Goal: Integrate `m_list + m_item` infinite-list generation into the PSD-to-UI workflow with general `UIWidget` lifecycle and item-level resource safety.
- Current state: implementation complete; prefix checking now generates list item widget scripts, widget naming/retention rules compile, and editor/runtime scenario validation is pending
- Validation: static checks passed where available; project-level `tsc` is blocked by pre-existing Cocos/Luban/extension declaration issues
- Remaining risk: Cocos editor component serialization for `pkg:ListView` and `pkg:ListItem`, generated script output, and runtime scroll reuse must be verified with the user's UI test.

## Change

- Change: `integrate-uiwidget-loop-list-psd`
- Task level: `L4`
- Date: `2026-06-25`

## Decisions

- User-approved protected framework impact: user explicitly allowed binding `m_list` to loop-list and introducing a general `UIWidget` concept.
- `UIWidget` scope: implement as a general child UI owner for list items and non-list child panels, not as a list-only item helper.
- `m_list` structure: normalize to fixed `m_list/content/m_item` instance structure so generated UI can be used without manual editor operations.
- Resource lifecycle: item/widget dynamic assets must release on recycle/release, and async sprite assignment must reject stale owner epochs.

## Validation

| Check | Result | Conclusion |
| --- | --- | --- |
| Initial OpenSpec status | pass | `proposal`, `design`, `specs`, and `tasks` are complete. |
| Baseline source reconfirmation | pass | `m_list` maps to `ListView` in config/runtime, prefix checker still only requires `cc.ScrollView`, `UIBase` only owns window-level dynamic assets, `ViewUtil` has no widget boundary, and `ListView` pools items without widget/resource recycle hooks. |
| Validation command discovery | pass | Available checks include `npx tsc --noEmit -p Client/tsconfig.json`, `npm run build` in `Client/extensions/uitscreate`, `npm run build` in `Client/extensions/psd2ccc`, OpenSpec status/validate, and `.agents/skills/tyou-dev/scripts/codex-observability-check.ps1`. |
| `Client/extensions/uitscreate npm run build` | pass | Extension TypeScript build completed. |
| `Client/extensions/psd2ccc npm run build` | pass | Extension TypeScript build completed. |
| `node --check` for `uitscreate` scene/menu scripts | pass | Edited editor runtime JavaScript has no syntax errors. |
| Focused TS transpile diagnostics | pass | Edited TypeScript files transpile without syntax diagnostics. |
| Stale widget resource guard verification | pass | Source-level guard check confirms owner epoch, stale release, widget recycle, and pool-before-recycle hooks exist. |
| Script generation boundary regression | pass | Mocked UI tree keeps normal parent fields such as `m_btnClose` on the parent UI and moves `m_item` internals such as `m_imgIcon/m_textName` into the generated item widget script. |
| Existing UI script safe merge regression | pass | Existing scripts now merge missing imports, fields, bind statements, events, and generated click stubs without deleting existing component bindings when a new `m_list` is detected. |
| Script existence source of truth | pass | Existing-script merge uses `asset-db query-asset-info` as the source of truth; deleted assets are not resurrected by filesystem fallback. |
| Test UI loop-list script check | pass | `TestUI.ts`, `TestPsdUI.ts`, and `widget/ItemContent.ts` transpile without syntax diagnostics; item script exists under `Client/assets/scripts/logic/ui/widget/`. |
| Test UI index label and list content alignment | pass | `ItemContent` writes the refreshed item index into the child `Label`; `TestPsdUI`, the prefab, and `uitscreate` list normalization use top-aligned `content` so item `0` starts from the list viewport top. |
| List viewport mask check | pass | `m_list` prefix checking adds `cc.Mask` on the list root without `cc.Graphics`; `TestPsdUI.prefab` has `cc.Mask` on `m_listContent` and no `cc.Graphics`. |
| Resolution adaptation alignment | pass | `ListView` now re-syncs top-aligned `content` during initialization and `SIZE_CHANGED`, so Widget-driven viewport resizing keeps the scroll content aligned with the list top. |
| Dynamic resource ref-count symmetry | pass | `UIBase` tracks dynamic assets with per-asset counts, so repeated loads of the same asset by one owner are released with the same number of `decRef` calls on recycle/release. |
| Grid list source check | pass | `ListView` has a `Layout.Type.GRID` path for horizontal-start and vertical-start grids; computed row/column count is clamped to at least `1` for oversized item templates. |
| Workflow text audit | pass | OpenSpec and topic references no longer include external reference-project text; retained text is limited to Tyou behavior, requirements, and validation. |
| Widget lifecycle comparison | pass | Reference implementation supports widget creation from an existing node, prefab/path creation, parent-owned child widgets, recursive update, and recursive destroy; Tyou should keep list-item widgets and dynamic prefab widgets on the same lifecycle base but use separate creation/update policy. |
| Loop-list module location | pass | `ListView` and `ListItem` now live under `Client/assets/ty-framework/module/ui/loop-list/`; business scripts, `ViewUtil`, generator imports, and verification scripts point to the framework path. |
| Dynamic widget runtime | pass | `UIBase.loadWidgetAsync()` loads prefab widgets with owner-epoch protection, dynamic widgets auto-update through their parent, and widget release destroys owned prefab nodes while list item widgets stay out of parent auto-update. |
| Widget script generation | pass | `uitscreate` now generates `m_item` widget scripts during prefix checking, still supports right-click standalone `Widget` prefab script generation, and keeps widget files retained through `WidgetImportAll` without updating `UIName`. |
| Widget and loop-list post-move checks | pass | `node --check` passed for `hierarchy-menu.js` and `prefix-checker-scene.js`; focused TypeScript transpile passed for `UIBase`, `UIWidget`, `UIWindow`, moved `ListView/ListItem`, `ViewUtil`, `TestPsdUI`, and `ItemContent`; stale-path scan had no matches. |
| Widget naming and retention rules | pass | Standalone widget generation now requires a `Widget` name marker, `m_itemContent` maps to `ItemContent`, duplicate generated item class names stop generation, and `UIImportAll -> widget/WidgetImportAll -> ItemContent` keeps widget scripts reachable without widget-to-UI imports. |
| Prefix-check item widget generation | pass | `node --check` passed for updated generator scripts; focused TypeScript transpile passed for current UI/widget scripts; scans confirm no `Widge` marker compatibility remains and prefix checking invokes item widget script generation after list normalization. |
| Widget Spine lifecycle | pass | `UIBase.loadSpineAsync()` and `loadSpineEffectAsync()` now bind `sp.SkeletonData` to the UI owner epoch, reject stale requests, clear `Skeleton.skeletonData` on recycle/release, and release tracked refs through `tyou.res.decRef`. |
| Standalone Widget recycle template | pass | Generated list item widget scripts keep `onRecycle()` for list reuse; right-click standalone Widget prefab scripts no longer generate an empty `onRecycle()` override by default. |
| `Client` project `tsc --noEmit` | warn | Blocked by existing Cocos engine declaration, Luban, and extension source typing errors unrelated to this change. |
| OpenSpec status/validate | pass | `openspec validate --changes integrate-uiwidget-loop-list-psd` passed. |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | warn | pass=7 warn=2 fail=0; progress is 48/51 with only editor/runtime validation tasks remaining, and protected-path changes were user-approved for this change. |

## Risks

- Remaining risks:
  - Editor-side custom component add/bind behavior for `pkg:ListView` and `pkg:ListItem` needs validation in Cocos Creator.
  - Already overwritten business scripts cannot be reconstructed from the generator unless the lost nodes still exist with bindable `m_` names or a backup/git version is available.
  - Existing legacy `renderEvent` callers can still manually load resources without widget helpers; docs must call this out.
  - Runtime fast-scroll image churn should be checked with the user's planned UI test.
- Follow-up:
  - User will create a UI test with one `m_list` and one serving `m_item` for editor workflow validation.

## Correction Loop

- Memory updated: no
- Wiki/docs sync needed: no
- OpenSpec archive ready: no
