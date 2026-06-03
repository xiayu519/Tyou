## Context

The current `.codex/harness-dashboard/index.html` is generated once. It does not update when active changes, archived changes, memory, or sensors change. The user expects a dashboard to behave like a panel, not a static report.

## Goals / Non-Goals

**Goals:**

- Provide a live local HTTP endpoint using built-in PowerShell/.NET only.
- Refresh dashboard data in the browser without manual regeneration.
- Keep the page open across Codex sessions.
- Support click-through details for lifecycle cards, changes, git status, and signals.
- Preserve the existing low-token rule: Codex does not read the dashboard unless asked.

**Non-Goals:**

- Do not add npm, React, Vite, a database, or external network services.
- Do not implement real-time streaming of model thoughts or terminal logs.
- Do not make the live dashboard a required gate for normal tasks.

## Decisions

1. Use PowerShell `System.Net.HttpListener`.
   - Rationale: No dependency install and works from a `.bat` launcher.
   - Alternative: Node/Vite server. Deferred to avoid dependency and token/tooling cost.

2. Compute state on each `/api/state` request.
   - Rationale: Simple and always current for small workflow metadata.
   - Alternative: file watchers. Deferred until polling proves insufficient.

3. Poll every 3 seconds by default.
   - Rationale: Responsive enough for workflow state without noisy filesystem watchers.

4. Keep the static generator.
   - Rationale: Useful fallback when the live server is not running.

## Risks / Trade-offs

- [Risk] Port `8787` is occupied -> Mitigation: expose `-Port` parameter and document it.
- [Risk] Windows blocks `HttpListener` prefix -> Mitigation: bind only to `127.0.0.1` and provide clear error output in the `.bat` window.
- [Risk] Frequent polling is wasteful -> Mitigation: 3 second interval and small metadata-only state.
