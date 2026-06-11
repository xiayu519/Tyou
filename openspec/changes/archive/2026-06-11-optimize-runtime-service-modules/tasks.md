## 1. OpenSpec Setup

- [x] 1.1 Create proposal, design, scheduler/state specs, runtime delta spec, and run-report scaffold.

## 2. Scheduler Services

- [x] 2.1 Optimize TimerModule lifecycle, query, cleanup, and diagnostics while preserving existing timer callback semantics.
- [x] 2.2 Optimize EventModule nested dispatch, pending removals, array emit, and cleanup without breaking priority/once/waitFor APIs.
- [x] 2.3 Optimize UpdateModule snapshot iteration, update-time removal, clearAll behavior, and diagnostics.

## 3. State Services

- [x] 3.1 Optimize StorageModule and StorageEx safe parsing, cache control, default reads, and convenience APIs.
- [x] 3.2 Optimize GameWorld server-time normalization, day-boundary event emission, time-scale guard, and destroy cleanup.

## 4. Documentation And Specs

- [x] 4.1 Synchronize README, Tyou topic references, main OpenSpec specs, and run-report with the new runtime service contracts.

## 5. Validation And Archive

- [x] 5.1 Run OpenSpec validation, diff checks, relevant TypeScript filtering, and observability sensor.
- [x] 5.2 Archive the completed change when tasks, specs, validation, and run-report are complete.
