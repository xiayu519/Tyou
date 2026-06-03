# Design

## Approach

Treat visualization as an optional experiment that is now retired from the active workflow. The retained harness is command/file based:

- `openspec/changes/<change>/run-report.md`
- `.agents/skills/tyou-dev/templates/run-report.md`
- `.agents/skills/tyou-dev/scripts/codex-observability-check.ps1`
- OpenSpec tasks/specs/status validation
- `.codex/memory/` decisions and feedback
- automatic archive when gates pass

## Removed Active Surfaces

- Static Markdown dashboard generator.
- Static HTML harness dashboard generator and generated `.codex/harness-dashboard/` output.
- Live dashboard server, launcher, and stop script.
- Workflow references that tell Codex or developers to use dashboards.
- Regression evals whose purpose is web/live dashboard behavior.

## Compatibility

Archived OpenSpec changes are left untouched as historical records. Current specs and docs become the source of truth for the active workflow.

## Risks

- Some historical archive files still mention dashboards; this is acceptable because they describe past experiments.
- Removing generated output may surprise anyone who bookmarked the local dashboard, but the developer explicitly requested removal.
