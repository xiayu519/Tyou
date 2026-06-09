## Why

`D:\aipro\first-game` has a Tyou UI framework update that lets a non-fullscreen popup stay as a popup while opting out of the shared blur background. The current project always selects the top prepared non-fullscreen window as the blur background owner, so a popup cannot express "do not blur behind me" without becoming fullscreen or bypassing the window system.

The user also asked Codex to become familiar with `D:\gitframework\unity_shader_dev`, a Unity URP shader skill repository, for a later Tyou/minigame-localized shader skill collection. This turn should inspect and record its structure without porting it yet.

## What Changes

- Add `blurBackground?: boolean` to Tyou window attributes.
- Keep default behavior unchanged: non-fullscreen popups still blur by default.
- Pass the resolved blur flag through `UIDecorator` -> `UIModule` -> `UIWindow`.
- Make blur background selection skip visible prepared non-fullscreen windows with `blurBackground === false`.
- Record the `unity_shader_dev` repository structure and localization risks for future work.

## Non-Goals

- Do not change UI opening API shape such as `tyou.ui.showUIAsync`.
- Do not modify `Tyou.ts` lifecycle registration.
- Do not create or port the local Tyou shader skill in this change.
- Do not modify `D:\aipro\first-game` or `D:\gitframework\unity_shader_dev`.

## Impact

- Framework files: `WindowAttribute.ts`, `UIDecorator.ts`, `UIWindow.ts`, `UIModule.ts`.
- Docs/spec/memory: UI lifecycle guidance, framework runtime spec, and a reference memory for `unity_shader_dev`.
- Backward compatibility: existing UI decorators keep current behavior because `blurBackground` defaults to `true`.

## Framework Change Confirmation

- Why framework, not business layer: blur ownership is centralized in `UIModule.refreshBlurBg()` and cannot be reliably controlled by individual UI scripts after the background node has been selected.
- Affected call chain: `@UIDecorator` attributes -> `UIWindow.customAttribute` -> `UIModule.showUIAsync()` -> `UIWindow.init()` -> `UIModule.getTopNonFullScreenWindowInstance()`.
- `Tyou.ts` lifecycle: no change required.
- Rollback cost: remove one optional field and revert four narrow field propagation/filter edits.
