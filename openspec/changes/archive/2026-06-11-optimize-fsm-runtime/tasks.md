## 1. OpenSpec Artifacts

- [x] 1.1 Add proposal, design, FSM specs, framework-runtime delta, task list, and run-report scaffold.

## 2. FSM Runtime

- [x] 2.1 Refactor `FSM` transition internals to serialize async `changeState()` and cancel stale waits.
- [x] 2.2 Add lifecycle and helper APIs while preserving existing FSM call sites.
- [x] 2.3 Make `FSMModule` update, owner destroy, and module destroy use stable snapshots.

## 3. Documentation And Validation

- [x] 3.1 Sync README, Tyou topic references, and main OpenSpec specs with the new FSM contract.
- [x] 3.2 Run OpenSpec, static search, relevant TypeScript, diff, and observability validation.
- [x] 3.3 Archive the completed change when synced and validated.
