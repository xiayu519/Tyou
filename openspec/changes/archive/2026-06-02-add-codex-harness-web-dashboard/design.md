## Context

The archived `add-codex-observability-harness` change added:

- `run-report.md` as local run evidence.
- `codex-observability-check.ps1` as deterministic sensors.
- `codex-observability-dashboard.ps1` as Markdown review output.

The next step is a local web surface that makes the same evidence easier to inspect. The implementation should avoid a dev server dependency by default and should not require Codex to ingest the generated page during ordinary work.

## Goals / Non-Goals

**Goals:**

- Generate a static HTML dashboard from current repository workflow files.
- Present a lifecycle board with connected, partial, missing, warning, and healthy states.
- Include side navigation for Intent, Control, Flow, Signal, and Continuity sections.
- Surface active and archived OpenSpec changes, tasks, run reports, sensors, memory, rules, and protected-path status.
- Keep token overhead low by letting scripts gather data and the browser render it for the developer.

**Non-Goals:**

- Do not introduce React/Vite/npm dependencies, a database, or an external service.
- Do not implement real-time agent tracing.
- Do not copy Unity/Claude-specific UI labels into Tyou's maintained workflow.
- Do not treat the dashboard as a gate that replaces OpenSpec, validation commands, or developer confirmation.

## Decisions

1. Generate static HTML directly from PowerShell.
   - Rationale: Works on the current Windows workspace, avoids dependency installs, and can be opened directly.
   - Alternative: React/Vite app. Deferred because it adds package/dependency cost before the data model is stable.

2. Keep dashboard data embedded in the generated page.
   - Rationale: Opening the HTML should work without a local server.
   - Alternative: Separate JSON fetch. Deferred because browsers may block local file fetches.

3. Represent harness maturity through lifecycle cards.
   - Rationale: Matches the user's visual target while staying Tyou-local.
   - Card groups: internal feedback loop, delivery/review loop, external feedback loop.

4. Preserve token efficiency.
   - Rationale: Codex should read compact rules and current change artifacts, not the whole dashboard.
   - The dashboard is for human review and can be regenerated on demand.

## Risks / Trade-offs

- [Risk] Static HTML becomes stale -> Mitigation: show generation time and provide one command to regenerate.
- [Risk] Visual polish hides missing integrations -> Mitigation: every card must show `connected`, `partial`, `missing`, `warning`, or `healthy` based on local evidence.
- [Risk] Script complexity grows -> Mitigation: keep it read-only and dependency-free.
- [Risk] Token cost grows if Codex reads the page -> Mitigation: docs state Codex should use sensor summaries unless explicitly asked to analyze dashboard details.
