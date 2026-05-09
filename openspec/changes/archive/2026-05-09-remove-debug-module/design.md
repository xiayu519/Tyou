## Context

`Client/assets/ty-framework/Tyou.ts` currently imports `DebugModule`, exposes `tyou.debug`, enables it during `onCreate()`, updates it every frame, and destroys it during `onDestroy()`. The implementation lives under `Client/assets/ty-framework/core/debug/DebugModule.ts` and creates a runtime overlay panel.

This is framework code, so implementation requires developer confirmation before editing `Client/assets/ty-framework/`.

## Goals / Non-Goals

**Goals:**

- Remove the built-in debug module from the Tyou runtime framework.
- Remove the `tyou.debug` API surface and its lifecycle participation.
- Delete the debug implementation files and keep TypeScript imports clean.
- Update AI/framework documentation that lists debug as a core module.

**Non-Goals:**

- Do not introduce a replacement debug UI.
- Do not modify mini-game platform tools or external diagnostics workflows.
- Do not change timer/event/UI/resource modules only because the removed panel displayed their counters.
- Do not add compatibility stubs for `tyou.debug`; callers must stop using the removed API.

## Decisions

1. **Delete instead of disabling by default.**
   Keeping `DebugModule` but never enabling it preserves API surface and still invites future use. The user explicitly wants the module removed, so the framework should no longer carry the module.

2. **Remove lifecycle hooks from `Tyou.ts`.**
   `onCreate()`, `onUpdate()`, and `onDestroy()` should not call into a removed debug object. This keeps per-frame runtime work and startup behavior clear.

3. **Update only direct documentation references.**
   The known doc reference is `tyou-dev` architecture startup documentation. Broader docs should only change if they explicitly list debug as an active framework module.

4. **No compatibility shim.**
   A shim would make the breaking change less visible and keep the obsolete API alive. The desired outcome is to remove the module completely.

## Risks / Trade-offs

- [Risk] Business code may call `tyou.debug.*`. -> Mitigation: search the workspace for `tyou.debug` / `DebugModule` before and after removal; any remaining usage must be removed or reported.
- [Risk] Public framework type changes can break downstream projects. -> Mitigation: mark the proposal as **BREAKING** and require developer confirmation before implementation.
- [Risk] Cocos `.meta` orphaning or TypeScript import errors after deletion. -> Mitigation: delete the module `.ts` and `.meta` together, then run TypeScript/static validation.
- [Risk] Documentation still claims debug exists. -> Mitigation: update `references/architecture.md` and run text search for debug references.
