## MODIFIED Requirements

### Requirement: PSD PNG dedup ownership
PSD export SHALL produce faithful PNG outputs for generated UI structure and SHALL NOT perform default PNG resource deduplication during Photoshop export.

#### Scenario: Same visual layer appears twice in one PSD
- **WHEN** two PSD layers export to identical PNG content
- **THEN** the PSD export script SHALL write independent PNG files and independent `relativePath` values by default
- **AND** later common-resource reuse SHALL be handled by the Cocos common atlas checker.

#### Scenario: Structure JSON remains an intermediate artifact
- **WHEN** PSD export writes `*-structure.json`
- **THEN** the JSON SHALL continue to describe the generated UI nodes and their exported PNG paths
- **AND** the JSON SHALL NOT be treated as the final resource-deduplication authority.
