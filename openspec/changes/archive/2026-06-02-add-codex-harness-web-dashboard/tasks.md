## 1. OpenSpec Setup

- [x] 1.1 Create proposal, design, delta spec, and implementation tasks.
- [x] 1.2 Add a run report for this L4 change.

## 2. Data Collection

- [x] 2.1 Add a read-only data collector for active and archived OpenSpec changes, tasks, run reports, memory, rules, and sensors.
- [x] 2.2 Ensure the data collector avoids business code, Cocos assets, Prefab/Scene/meta, Luban data, and generated config.

## 3. Web Dashboard

- [x] 3.1 Add a static HTML dashboard generator with Tyou-local lifecycle cards and side navigation.
- [x] 3.2 Generate the dashboard artifact under `.codex/harness-dashboard/`.

## 4. Workflow Integration

- [x] 4.1 Update Codex workflow docs/rules/skills/specs with the web dashboard command and token boundary.
- [x] 4.2 Add a regression eval for the web dashboard workflow.
- [x] 4.3 Update archive policy so completed unambiguous changes archive without redundant developer confirmation.

## 5. Validation

- [x] 5.1 Run the web dashboard generator, sensor checks, OpenSpec status, and JSON/HTML sanity checks.
- [x] 5.2 Confirm no external Unity/Claude workflow language is introduced into local Tyou rules and docs.
