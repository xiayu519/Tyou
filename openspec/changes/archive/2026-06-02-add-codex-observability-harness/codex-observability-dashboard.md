# Codex Observability Dashboard

- Change: `add-codex-observability-harness`
- Generated: 2026-06-02T14:05:59
- Change directory: `openspec\changes\add-codex-observability-harness`

## OpenSpec Status

```text
Change: add-codex-observability-harness
Schema: spec-driven
Progress: 4/4 artifacts complete

[x] proposal
[x] design
[x] specs
[x] tasks

All artifacts complete!
```

## Task Progress

- Schema: `spec-driven`
- Progress: 11/11
- State: `all_done`

- [x] 1.1 Create proposal, design, and codex-ai-workflow delta specs for the observability harness.
- [x] 1.2 Create implementation tasks with short-term, medium-term, and long-term milestones.
- [x] 2.1 Add a run-report template/convention for L3/L4 Codex changes.
- [x] 2.2 Update OpenSpec workflow rules and `tyou-dev` routing to mention run evidence.
- [x] 3.1 Add a local deterministic sensor script for Codex workflow changes.
- [x] 3.2 Document sensor usage and limitations in the human workflow docs.
- [x] 4.1 Add a local dashboard generator for OpenSpec change review.
- [x] 4.2 Document dashboard usage and archive-review role.
- [x] 5.1 Update README/Books/specs/skills/rules consistently without copying external Unity/Claude workflow language.
- [x] 5.2 Record accepted external references and local decision in `.codex/memory/`.
- [x] 5.3 Validate OpenSpec status, scripts, and workflow consistency searches.

## Run Report

# Codex Run Report

## Change

- Change: `add-codex-observability-harness`
- Task level: `L4`
- Date: `2026-06-02`
- Operator: `Codex`

## Scope

- Goal: Add local Codex observability from short-term run evidence to medium-term sensors and long-term dashboard generation.
- Non-goals: Do not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta, Luban data, generated config, or external services.
- Touched files/directories:
  - `openspec/changes/add-codex-observability-harness/`
  - `.agents/skills/tyou-dev/`
  - `.codex/rules/tyou-dev/openspec-workflow.md`
  - `.codex/memory/`
  - `AGENTS.md`
  - `README.md`
  - `Books/AI-Development-Workflow.md`
  - `openspec/specs/codex-ai-workflow/spec.md`
  - `wiki-sync.yaml`
- Protected surfaces checked:
  - `Client/assets/ty-framework/`: `unchanged`
  - Prefab/Scene/meta: `unchanged`
  - Luban/generated config: `unchanged`

## Task Progress

- Completed tasks:
  - `[x] 1.1 Create proposal, design, and codex-ai-workflow delta specs for the observability harness.`
  - `[x] 1.2 Create implementation tasks with short-term, medium-term, and long-term milestones.`
  - `[x] 2.1 Add a run-report template/convention for L3/L4 Codex changes.`
  - `[x] 2.2 Update OpenSpec workflow rules and tyou-dev routing to mention run evidence.`
  - `[x] 3.1 Add a local deterministic sensor script for Codex workflow changes.`
  - `[x] 3.2 Document sensor usage and limitations in the human workflow docs.`
  - `[x] 4.1 Add a local dashboard generator for OpenSpec change review.`
  - `[x] 4.2 Document dashboard usage and archive-review role.`
  - `[x] 5.1 Update README/Books/specs/skills/rules consistently without copying external Unity/Claude workflow language.`
  - `[x] 5.2 Record accepted external references and local decision in .codex/memory/.`
  - `[x] 5.3 Validate OpenSpec status, scripts, and workflow consistency searches.`
- Deferred tasks:
  - `none`

## Decisions

- Store trace evidence as Markdown in each OpenSpec change: readable in review and archive without extra services.
- Keep scripts under `.agents/skills/tyou-dev/scripts/`: this is Codex workflow tooling, not runtime product tooling.

## Validation

| Command | Result | Notes |
| --- | --- | --- |
| `cmd /c openspec.cmd --version` | `pass` | OpenSpec `1.3.1`. |
| `Test-Path openspec` | `pass` | Repository OpenSpec directory exists. |
| `powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan` | `pass` | Wiki scan completed; configured mappings reported covered. |
| `powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/codex-observability-dashboard.ps1 -Change add-codex-observability-harness` | `pass` | Dashboard generated in the change directory. |
| `Get-Content .agents/skills/tyou-dev/evals/evals.json -Encoding UTF8 \| ConvertFrom-Json` | `pass` | Eval JSON parsed successfully. |
| `rg -n "Unity\|Claude\|TEngine\|Routa" AGENTS.md README.md Books .codex/rules openspec/specs .agents/skills/tyou-dev` | `pass` | No external Unity/Claude workflow terms found in local rule/docs surfaces. |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | `pass` | Final run expected after all tasks are checked. |

## Risks

- Remaining risks:
  - `none`
- Follow-up:
  - Archive the OpenSpec change when the developer wants to close it.

## Correction Loop

- Memory updated: `yes`
- Wiki/docs sync needed: `no`
- OpenSpec archive ready: `yes`

## Sensor Results

| Status | Check | Message |
| --- | --- | --- |
| `pass` | `change-dir` | Found openspec\changes\add-codex-observability-harness |
| `pass` | `artifact:proposal.md` | Found openspec\changes\add-codex-observability-harness\proposal.md |
| `pass` | `artifact:design.md` | Found openspec\changes\add-codex-observability-harness\design.md |
| `pass` | `artifact:tasks.md` | Found openspec\changes\add-codex-observability-harness\tasks.md |
| `pass` | `artifact:specs` | Found 1 delta spec file(s) |
| `pass` | `tasks-progress` | 11/11 tasks complete |
| `pass` | `run-report` | run-report.md has the required sections |
| `pass` | `openspec-status` | OpenSpec status loaded for schema spec-driven |
| `pass` | `protected-paths` | No protected path changes detected in git status |

- Totals: pass=9, warn=0, fail=0

## Git Status

```text
 M .agents/skills/tyou-dev/SKILL.md
 M .agents/skills/tyou-dev/evals/evals.json
 M .codex/memory/INDEX.md
 M .codex/rules/tyou-dev/openspec-workflow.md
 M AGENTS.md
 M Books/AI-Development-Workflow.md
 M README.md
 M openspec/specs/codex-ai-workflow/spec.md
 M wiki-sync.yaml
?? .agents/skills/tyou-dev/scripts/
?? .agents/skills/tyou-dev/templates/
?? .codex/memory/decisions/codex-observability-harness.md
?? .codex/memory/references/sdd-harness-articles.md
?? openspec/changes/
```

## Review Notes

- This dashboard is a review aid, not a source of truth.
- Source of truth remains source code, OpenSpec artifacts, required validation commands, and explicit developer confirmations.
- If recurring issues appear here, record them in .codex/memory/ and update stale docs through OpenSpec/wiki-sync.
