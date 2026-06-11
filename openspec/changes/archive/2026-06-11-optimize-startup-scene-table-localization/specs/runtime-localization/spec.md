## MODIFIED Requirements

### Requirement: Localization loads from Luban
The runtime localization API MUST initialize or reload its text dictionary from the Luban configuration loaded by `tyou.table`, and this refresh MUST be driven by startup orchestration after table loading succeeds rather than by `TableModule` directly.

#### Scenario: Startup table orchestration completes
- **WHEN** the Tyou startup table orchestration API finishes loading Luban tables successfully
- **THEN** `tyou.i18n` can resolve localization keys from the generated Luban localization table

#### Scenario: Localization reload is requested without loaded tables
- **WHEN** `tyou.i18n.reloadFromTable()` runs before valid Luban tables are available
- **THEN** it returns a failure result
- **AND** the localization API keeps deterministic missing-key behavior rather than throwing

#### Scenario: Localization table is reloaded
- **WHEN** `tyou.i18n.reloadFromTable()` rebuilds the localization dictionary from loaded tables
- **THEN** enabled localized labels are notified through the runtime language-changed event and can refresh their displayed text
