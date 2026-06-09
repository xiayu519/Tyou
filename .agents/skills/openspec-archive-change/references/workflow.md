# OpenSpec Archive Workflow

This reference preserves the detailed `openspec-archive-change` procedure. Read it before archiving a completed change.

## Purpose

Archive a completed OpenSpec change.

This is the Codex OpenSpec archive skill. Follow the Tyou OpenSpec reference at `.agents/skills/tyou-dev/references/openspec-workflow.md`.

## Input

Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous, you MUST prompt for available changes.

## Steps

1. Select the change.

   If a change name is explicit, use it.

   If no change name is provided, run `openspec list --json` to get available changes.

   - If exactly one active change exists and current conversation context clearly refers to it, use that change.
   - If multiple active changes exist or context is ambiguous, ask the developer to select.

   Show only active changes, not already archived. Include the schema used for each change if available.

   **IMPORTANT:** Do not guess among multiple possible changes.

2. Check artifact completion status.

   Run:

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:

   - `schemaName`: the workflow being used.
   - `artifacts`: list of artifacts with status, such as `done` or another state.

   If any artifacts are not `done`, display a warning listing incomplete artifacts and ask before proceeding.

3. Check task completion status.

   Read the tasks file, typically `tasks.md`, and count incomplete `- [ ]` tasks vs complete `- [x]` tasks.

   If incomplete tasks are found, display a warning showing the count and ask before proceeding.

   If no tasks file exists, proceed without a task-related warning.

4. Assess delta spec sync state.

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without a sync prompt.

   If delta specs exist:

   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`.
   - Determine what changes would be applied: additions, modifications, removals, or renames.
   - Show a combined summary before prompting if a prompt is needed.

   Decision options:

   - If changes are needed, sync before archiving; ask only if sync cannot be performed or the developer explicitly asked to skip sync.
   - If already synced, archive without another confirmation.

   If no sync tool exists, manually compare each `openspec/changes/<name>/specs/<capability>/spec.md` with `openspec/specs/<capability>/spec.md` and report whether the main spec is already in sync. Do not silently archive unsynced workflow specs.

   When the change name is clear, artifacts are done, tasks are complete, delta specs are synced, validations pass, and no blocking risk is present, archive directly without asking for an extra developer confirmation.

5. Perform the archive.

   Create the archive directory if it does not exist:

   ```bash
   New-Item -ItemType Directory -Force openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`.

   If the target already exists, fail with an error and suggest renaming the existing archive or using a different date.

   If no target exists, move the change directory to archive:

   ```powershell
   Move-Item -LiteralPath "openspec/changes/<name>" -Destination "openspec/changes/archive/YYYY-MM-DD-<name>"
   ```

6. Display summary.

   Show archive completion summary including:

   - Change name.
   - Schema used.
   - Archive location.
   - Whether specs were synced, if applicable.
   - Any warnings for incomplete artifacts or tasks.

## Output On Success

```text
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** Synced to main specs, no delta specs, or sync skipped

All artifacts complete. All tasks complete.
```

## Guardrails

- Always prompt for change selection if not provided and not clearly inferable.
- Use artifact graph from `openspec status --json` for completion checking.
- Do not block archive on warnings alone; inform and confirm when gates are not clean.
- Preserve `.openspec.yaml` when moving to archive.
- Show a clear summary of what happened.
- If sync is requested, use the OpenSpec sync-specs approach if available.
- If delta specs exist, always run sync assessment before archiving.
- On Windows, use native PowerShell `Move-Item` with literal paths and verify the destination stays under `openspec/changes/archive/`.
- After archive, run `cmd /c openspec.cmd list --json` or `cmd /c openspec.cmd validate --all` and report the result.
