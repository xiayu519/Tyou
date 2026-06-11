## 1. OpenSpec Artifacts

- [x] 1.1 Add design, spec delta, task list, and run-report scaffold for the startup-chain change.

## 2. Table Startup

- [x] 2.1 Refactor `TableModule` into an idempotent Luban table loader with load state, progress callback support, and cleanup.
- [x] 2.2 Add Tyou-level table startup orchestration and switch `Main.appStart()` to it without changing resource-index loading.

## 3. Localization And Scene Lifecycle

- [x] 3.1 Make localization reload return readiness state and notify active localized labels after a successful table refresh.
- [x] 3.2 Harden scene switching cleanup so failed or stale async switches do not leave the old scene or leak `_isSwitching`.

## 4. Documentation And Validation

- [x] 4.1 Sync README and Tyou topic references with the new startup-chain contract.
- [x] 4.2 Run OpenSpec, static import/search, relevant TypeScript, diff, and observability validation.
- [x] 4.3 Archive the completed change when all specs and tasks are synchronized.
