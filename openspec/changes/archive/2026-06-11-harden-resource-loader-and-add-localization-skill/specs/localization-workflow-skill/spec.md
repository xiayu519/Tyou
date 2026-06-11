## ADDED Requirements

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

#### Scenario: Runtime localization access is needed
- **WHEN** business code needs to display localized text
- **THEN** the skill directs runtime usage to `tyou.i18n.get(key, ...args)` or `LocalizeLabel`
- **AND** it forbids handwritten dictionary files as the primary path
