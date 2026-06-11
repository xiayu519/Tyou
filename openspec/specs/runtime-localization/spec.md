# runtime-localization Specification

## Purpose
Define the Tyou runtime localization contract. Localization text is a Luban-backed framework capability and is initialized from generated configuration loaded by `tyou.table`.
## Requirements
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

### Requirement: Localization provides runtime language switching
The runtime localization API MUST provide current language query, language switching, key lookup, and formatted text lookup.

#### Scenario: Text key is resolved
- **WHEN** business code calls `tyou.i18n.get(key, ...args)`
- **THEN** the API returns the text for the current language and applies positional arguments when provided

#### Scenario: Language changes
- **WHEN** business code calls `tyou.i18n.switchLanguage(language)`
- **THEN** the current language changes
- **AND** a language-changed event is emitted through the runtime event system

#### Scenario: Key is missing
- **WHEN** business code asks for a key that is not present in the Luban localization table
- **THEN** the API returns a deterministic fallback string rather than throwing

### Requirement: Localized Label refreshes on language change
The runtime localization API MUST provide an attachable Label component that refreshes text when the active language changes.

#### Scenario: Label is bound to key
- **WHEN** a `LocalizeLabel` component is enabled with a localization key
- **THEN** it sets its Label string from `tyou.i18n`

#### Scenario: Active language changes
- **WHEN** `tyou.i18n.switchLanguage(language)` emits the language-changed event
- **THEN** enabled `LocalizeLabel` instances refresh their Label text
