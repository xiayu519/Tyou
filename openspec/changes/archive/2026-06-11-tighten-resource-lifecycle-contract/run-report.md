## Executive Summary

Change: `tighten-resource-lifecycle-contract`

本次变更删除无引用旧 `LoaderManager` 空壳，补强远程图片转 `SpriteFrame` 的托管引用与失败释放路径，并把资源释放语义写入框架参考文档。

## Change

- Deleted `Client/assets/ty-framework/module/loader/LoaderManager.ts` and `.meta`.
- Added `ManagedAssetLoader.loadRemoteSpriteFrameAsync()` to create retained runtime SpriteFrames from remote images.
- Updated `SpriteAssignService` to release loaded SpriteFrames when an async assignment becomes stale or cannot assign.
- Updated `resource-api.md` with lifecycle ownership rules.
- Added runtime resource safety delta scenarios.

## Decisions

- `LoaderManager` is removed rather than kept as a compatibility shell because source and uuid searches show no live references.
- Remote SpriteFrames are retained when created and released by UI/scene/manual lifecycle owners through existing `decRef`.
- Stale async sprite requests release their loaded SpriteFrame instead of silently dropping it.
- No shared remote SpriteFrame cache is added in this change; correctness and lifecycle clarity come first.

## Sensors

## Validation

- `rg -n "LoaderManager|tyou\\.res\\.loader|LoaderManager\\.Loader|new LoaderManager|c12f3a83-3253-4a2c-8fbf-9e3c29ae0c9e" Client\assets Client\extensions Client\settings -S`
  - Result: no matches.
- `cmd /c openspec.cmd validate tighten-resource-lifecycle-contract --strict`
  - Result: passed.
- `cmd /c openspec.cmd validate --all`
  - Result: passed before archive.
- `git diff --check`
  - Result: no whitespace errors; Git reported CRLF normalization warnings only.
- `cmd /c npx tsc -p tsconfig.json --noEmit`
  - Result: blocked by pre-existing Cocos engine declarations, generated Luban code, and extension typing errors; no diagnostics pointed at the modified loader implementation before environment errors.

## Risks

- Cocos Editor may still need a resource database refresh after deleting a TypeScript source and `.meta`.
- Remote SpriteFrames are not shared by URL yet; repeated remote avatar usage may deserve a later explicit LRU cache.

## Correction Loop

- Initial resource review kept `LoaderManager` as a conservative `.meta` shell. After explicit user review and uuid search, the better framework choice is deletion.
