## 1. Confirmation

- [x] 1.1 Confirm with the developer that this framework-level breaking change should remove `tyou.debug` completely.

## 2. Framework Removal

- [x] 2.1 Remove `DebugModule` import, `debug` field, and debug lifecycle calls from `Client/assets/ty-framework/Tyou.ts`.
- [x] 2.2 Delete `Client/assets/ty-framework/core/debug/DebugModule.ts` and its `.meta` file.
- [x] 2.3 Search for remaining `tyou.debug`, `DebugModule`, and `core/debug` references and remove or report any callers.

## 3. Documentation

- [x] 3.1 Update `tyou-dev` architecture reference so the core module list no longer includes `debug`.
- [x] 3.2 Search AI workflow/books/spec references for debug module mentions and update any active documentation.

## 4. Validation

- [x] 4.1 Run TypeScript/static validation that is available in the project.
- [x] 4.2 Run `openspec status --change "remove-debug-module" --json` and confirm tasks reflect implementation progress.
