# localization-workflow-skill Specification

## Purpose
Define the project skill contract for Tyou localization text work.

## Requirements
### Requirement: Localization skill routes text work through Luban
The Codex workflow MUST provide a project skill for Tyou localization text work that routes source text changes through the Luban localization table and generated table pipeline.

#### Scenario: Localization text change is requested
- **WHEN** a developer asks to add or modify Tyou multilingual text, localization, i18n, `tyou.i18n`, or `LocalizeLabel` content
- **THEN** Codex uses the localization skill
- **AND** the skill directs Codex to use `luban-dev` for source table inspection or edits

#### Scenario: Localization table source is identified
- **WHEN** the localization skill is used for table-backed text
- **THEN** it identifies `Design/config/#TableLocalizationText.xlsx` as the source table
- **AND** it treats `id`, `key`, `zh_cn`, and `en_us` as the current required fields

#### Scenario: Existing localization text exactly matches
- **WHEN** a requested localization text has the same `zh_cn` and `en_us` values as an existing `TableLocalizationText` row
- **THEN** Codex reuses the existing row's `id/key`
- **AND** it does not create a duplicate localization row

#### Scenario: Existing localization text is semantically similar
- **WHEN** similar existing localization text may satisfy the requested copy and the candidate check is low-cost
- **THEN** Codex lists the candidate `id/key` and wording difference for developer confirmation
- **AND** it asks whether to reuse the similar row or create a new exact row

#### Scenario: Similarity check is too expensive
- **WHEN** a semantic similarity scan would consume substantial context or token budget
- **THEN** Codex performs only exact `zh_cn` and `en_us` matching
- **AND** it states that similar-meaning comparison was skipped for cost control

#### Scenario: Runtime localization access is needed
- **WHEN** business code needs to display localized text
- **THEN** the skill directs runtime usage to `tyou.i18n.get(key, ...args)` or `LocalizeLabel`
- **AND** it forbids handwritten dictionary files as the primary path
