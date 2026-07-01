## ADDED Requirements

### Requirement: JSON Spine sample resource exists
The project SHALL include one complete JSON Spine sample resource set under `Client/assets/asset-raw/spine/` for local import and asset-index validation.

#### Scenario: Sample files are present
- **WHEN** the JSON Spine sample is inspected on disk
- **THEN** the target directory MUST contain matching `.json`, `.atlas`, and `.png` files plus their `.meta` files

#### Scenario: Sample remains isolated
- **WHEN** the sample is copied into the project
- **THEN** it MUST use a distinct directory name to avoid colliding with existing asset logical names
