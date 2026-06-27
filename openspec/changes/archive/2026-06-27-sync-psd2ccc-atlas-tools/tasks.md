## 1. Extension Wiring

- [x] 1.1 Add `psd2ccc` messages, `Tools` menu items, and panel registrations for all-atlas check and redundant-atlas clean.
- [x] 1.2 Add main extension methods that route menu and panel messages to shared checker APIs.

## 2. Shared Atlas Logic

- [x] 2.1 Extend `common-atlas-checker.ts` with all-atlas plan, redundant-atlas plan, execute, and discard APIs while preserving node-level check behavior.
- [x] 2.2 Add the scene-walker bridge needed by full-project replacement while preserving node-level replacement behavior.
- [x] 2.3 Add panel source files that display selectable plans and call the shared extension messages.

## 3. Validation

- [x] 3.1 Build `Client/extensions/psd2ccc` and verify generated `dist/` output.
- [x] 3.2 Validate OpenSpec status and archive the completed change when requirements and tasks are satisfied.
