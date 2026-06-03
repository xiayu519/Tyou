## 1. OpenSpec Setup

- [x] 1.1 Create proposal, design, delta spec, tasks, and run report.

## 2. Live Server

- [x] 2.1 Add a local-only PowerShell live dashboard server with `/`, `/api/state`, and `/api/ping`.
- [x] 2.2 Reuse the existing metadata collector logic without scanning business code or Cocos assets.

## 3. Interactive Page

- [x] 3.1 Add polling refresh to keep the page current while open.
- [x] 3.2 Add click-through details for lifecycle cards, changes, signals, and git status.

## 4. Launcher And Docs

- [x] 4.1 Update `open-harness-dashboard.bat` to start the live server and open the URL.
- [x] 4.2 Update workflow docs/rules/specs/skill/memory/evals for live dashboard behavior and token boundary.

## 5. Validation And Archive

- [x] 5.1 Validate live server syntax, static generator fallback, sensor checks, OpenSpec status, and JSON parsing.
- [x] 5.2 Archive automatically when all gates pass.
