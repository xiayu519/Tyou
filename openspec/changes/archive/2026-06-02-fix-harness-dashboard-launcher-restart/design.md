## Context

The live dashboard runs on `127.0.0.1:8787`. A stale process can keep serving an old page even after the script has been changed.

## Goals / Non-Goals

**Goals:**

- Make the `.bat` launcher idempotent.
- Stop stale dashboard processes before restart.
- Keep behavior local and transparent.

**Non-Goals:**

- Do not add background services or auto-start behavior.
- Do not keep the dashboard running after the command window closes.

## Decisions

- Use the pid file when available.
- Also inspect port `8787` through PowerShell and stop the owning process, because older services may not have a pid file.

## Risks / Trade-offs

- [Risk] Another local tool uses port `8787` -> Mitigation: this port is reserved for the dashboard launcher in this project; stopping it is appropriate when the user runs this launcher.
