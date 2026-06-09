# OpenSpec Propose Workflow

This reference preserves the detailed `openspec-propose` procedure. Read it before creating or completing a change proposal.

## Purpose

Propose a new change: create the change and generate all artifacts in one step.

This is the Codex OpenSpec propose skill. Follow the Tyou OpenSpec reference at `.agents/skills/tyou-dev/references/openspec-workflow.md`.

Create a change with artifacts:

- `proposal.md` (what and why)
- `design.md` (how)
- `tasks.md` (implementation steps)

When ready to implement, invoke `$openspec-apply-change` (Codex skill).

## Input

The user's request should include a change name in kebab-case or a description of what they want to build.

## Steps

1. If no clear input is provided, ask what they want to build.

   Ask an open-ended question:

   ```text
   What change do you want to work on? Describe what you want to build or fix.
   ```

   From their description, derive a kebab-case name, for example `add-user-auth` from "add user authentication".

   **IMPORTANT:** Do not proceed without understanding what the user wants to build.

2. Create the change directory.

   ```bash
   openspec new change "<name>"
   ```

   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

3. Get the artifact build order.

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to get:

   - `applyRequires`: array of artifact IDs needed before implementation, for example `["tasks"]`.
   - `artifacts`: list of all artifacts with status and dependencies.

4. Create artifacts in sequence until apply-ready.

   Track progress through the artifacts.

   Loop through artifacts in dependency order, starting with artifacts that have no pending dependencies.

   For each artifact that is `ready`:

   - Get instructions:

     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```

   - The instructions JSON includes:
     - `context`: project background, constraints for you. Do not include in output.
     - `rules`: artifact-specific constraints for you. Do not include in output.
     - `template`: the structure to use for your output file.
     - `instruction`: schema-specific guidance for this artifact type.
     - `outputPath`: where to write the artifact.
     - `dependencies`: completed artifacts to read for context.
   - Read completed dependency files for context.
   - Create the artifact file using `template` as the structure.
   - Apply `context` and `rules` as constraints, but do not copy them into the file.
   - Show brief progress: `Created <artifact-id>`.

   Continue until all `applyRequires` artifacts are complete:

   - After creating each artifact, re-run `openspec status --change "<name>" --json`.
   - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array.
   - Stop when all `applyRequires` artifacts are done.

   If an artifact requires user input because context is unclear, ask for clarification, then continue creation.

5. Show final status.

   ```bash
   openspec status --change "<name>"
   ```

## Output

After completing all artifacts, summarize:

- Change name and location.
- List of artifacts created with brief descriptions.
- What's ready: `All artifacts created! Ready for implementation.`
- Prompt: `Invoke $openspec-apply-change or ask me to implement to start working on the tasks.`

## Artifact Creation Guidelines

- Follow the `instruction` field from `openspec instructions` for each artifact type.
- The schema defines what each artifact should contain; follow it.
- Read dependency artifacts for context before creating new ones.
- Use `template` as the structure for your output file and fill in its sections.
- **IMPORTANT:** `context` and `rules` are constraints for you, not content for the file.
- Do not copy `<context>`, `<rules>`, or `<project_context>` blocks into the artifact.

## Guardrails

- Create all artifacts needed for implementation, as defined by schema `apply.requires`.
- Always read dependency artifacts before creating a new one.
- If context is critically unclear, ask the user; otherwise prefer making reasonable decisions to keep momentum.
- If a change with that name already exists, ask if the user wants to continue it or create a new one.
- Verify each artifact file exists after writing before proceeding to the next artifact.
