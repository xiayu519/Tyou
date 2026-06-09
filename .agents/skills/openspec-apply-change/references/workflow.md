# OpenSpec Apply Workflow

This reference preserves the detailed `openspec-apply-change` procedure. Read it before implementing an active change.

## Purpose

Implement tasks from an OpenSpec change.

This is the Codex OpenSpec apply skill. Follow the Tyou OpenSpec reference at `.agents/skills/tyou-dev/references/openspec-workflow.md`.

## Input

Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous, you MUST prompt for available changes.

## Steps

1. Select the change.

   If a name is provided, use it. Otherwise:

   - Infer from conversation context if the user mentioned a change.
   - Auto-select if only one active change exists.
   - If ambiguous, run `openspec list --json` to get available changes and ask the user to select.

   Always announce: `Using change: <name>` and how to override, for example `$openspec-apply-change <other>`.

2. Check status to understand the schema.

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:

   - `schemaName`: the workflow being used, for example `spec-driven`.
   - Which artifact contains the tasks, typically `tasks` for spec-driven workflows.

3. Get apply instructions.

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:

   - `contextFiles`: artifact ID to concrete file path arrays. This varies by schema.
   - Progress: total, complete, remaining.
   - Task list with status.
   - Dynamic instruction based on current state.

   Handle states:

   - If `state: "blocked"` due to missing artifacts, show a message and suggest using the appropriate continuation/propose flow.
   - If `state: "all_done"`, report completion and suggest archive.
   - Otherwise, proceed to implementation.

   If `openspec instructions apply` is unavailable in the installed CLI, fall back to `openspec status --change "<name>" --json` and direct reads of current change artifacts. State that fallback explicitly.

4. Read context files.

   Read every file path listed under `contextFiles` from the apply instructions output.

   The files depend on the schema:

   - `spec-driven`: proposal, specs, design, tasks.
   - Other schemas: follow the `contextFiles` from CLI output.

5. Show current progress.

   Display:

   - Schema being used.
   - Progress, for example `N/M tasks complete`.
   - Remaining tasks overview.
   - Dynamic instruction from CLI.

6. Implement tasks, looping until done or blocked.

   For each pending task:

   - Show which task is being worked on.
   - Make the code or document changes required.
   - Keep changes minimal and focused.
   - Mark the task complete in the tasks file immediately: `- [ ]` to `- [x]`.
   - Continue to the next task.

   Pause if:

   - Task is unclear.
   - Implementation reveals a design issue.
   - A task requires modifying `Client/assets/ty-framework/`.
   - A task requires Cocos Prefab/Scene/meta edits without a precise workflow.
   - A task requires Luban schema/data deletion or incompatible config changes.
   - The needed reference or source behavior conflicts with Tyou topic references or OpenSpec artifacts.
   - An error or blocker is encountered.
   - The user interrupts.

7. On completion or pause, show status.

   Display:

   - Tasks completed this session.
   - Overall progress: `N/M tasks complete`.
   - If all done, suggest archive.
   - If paused, explain why and wait for guidance.

## Output During Implementation

```text
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
Task complete

Working on task 4/7: <task description>
[...implementation happening...]
Task complete
```

## Output On Completion

```text
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete

### Completed This Session
- [x] Task 1
- [x] Task 2

All tasks complete! Ready to archive this change.
```

## Output On Pause

```text
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

## Guardrails

- Keep going through tasks until done or blocked.
- Always read context files before starting, using the apply instructions output.
- If a task is ambiguous, pause and ask before implementing.
- If implementation reveals issues, pause and suggest artifact updates.
- Keep changes minimal and scoped to each task.
- Update the task checkbox immediately after completing each task.
- Pause on errors, blockers, or unclear requirements.
- Use `contextFiles` from CLI output; do not assume specific file names.
- If a task changes docs or workflow references, include `AGENTS.md`, `**/AGENTS.override.md`, `.agents/skills/*`, `README.md`, `Books/AI-Development-Workflow.md`, and `openspec/specs/` in the consistency check. Include `.codex/rules/*.rules` only for official command policy changes.
- For each completed task, update `tasks.md` immediately in the same change.

## Fluid Workflow Integration

This skill supports the actions-on-a-change model:

- It can be invoked before all artifacts are done if tasks exist, after partial implementation, or interleaved with other actions.
- It allows artifact updates when implementation reveals design issues; work fluidly instead of treating phases as a rigid lock.
