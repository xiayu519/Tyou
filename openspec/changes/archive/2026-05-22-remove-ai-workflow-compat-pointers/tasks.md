## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, delta spec, and tasks for removing compatibility pointers
- [x] 1.2 Verify the change reaches apply-ready status

## 2. Remove Compatibility References

- [x] 2.1 Delete `.agents/skills/tyou-dev/references/`
- [x] 2.2 Verify no workflow docs or skill routes depend on the deleted reference path

## 3. Add Sync Rule

- [x] 3.1 Add dual-adapter sync rules to shared workflow recovery guidance
- [x] 3.2 Add the same sync expectation to Codex and Claude entry/skill shells
- [x] 3.3 Update main `ai-workflow-adapters` spec with the sync requirement

## 4. Validate

- [x] 4.1 Verify Codex and Claude adapter shells have no runtime dependency on each other, with cross-shell mentions limited to the AI-workflow sync checklist
- [x] 4.2 Verify OpenSpec status and archive the completed change
