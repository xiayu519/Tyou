## ADDED Requirements

### Requirement: Smart object UI structure expansion
PSD UI import SHALL attempt to expand visible Photoshop smart objects into editable Cocos child nodes by default.

#### Scenario: Smart object contains UI layers
- **WHEN** a visible smart object contains visible image, text, or group layers
- **THEN** the generated Cocos node tree includes a group for the smart object and child nodes for its internal visible layers

#### Scenario: Smart object expansion fails
- **WHEN** a smart object cannot be opened, parsed, transformed, or safely expanded
- **THEN** the importer falls back to exporting that smart object as a PNG node and records the fallback reason in the export report

### Requirement: PSD visual order preservation
PSD UI import SHALL preserve Photoshop layer visual stacking order in the generated Cocos hierarchy.

#### Scenario: Foreground layer overlaps background layer
- **WHEN** a foreground PSD layer overlaps a background PSD layer
- **THEN** the generated foreground Cocos node renders above the generated background Cocos node

### Requirement: PSD coordinate preservation
PSD UI import SHALL place generated Cocos nodes according to their PSD source bounds relative to their generated parent node.

#### Scenario: Nested child layer under group
- **WHEN** a PSD child layer is nested under a group or expanded smart object
- **THEN** the generated child node appears at the same visual position relative to that parent as in Photoshop

#### Scenario: Trimmed PNG uses source bounds
- **WHEN** a PNG asset is trimmed during export
- **THEN** the generated Cocos node uses the original PSD source bounds for positioning and the trimmed size for sprite content size

### Requirement: Image suffix composite export
PSD UI import SHALL export any visible layer, group, or smart object whose name ends with `.img` as a single PNG node.

#### Scenario: `.img` smart object contains nested layers
- **WHEN** a visible smart object name ends with `.img`
- **THEN** the generated Cocos node tree contains one PNG node for that smart object and does not expand its internal layers

#### Scenario: `.img` group contains nested layers
- **WHEN** a visible PSD group name ends with `.img`
- **THEN** the generated Cocos node tree contains one PNG node for that group and does not generate child nodes for its internal layers

### Requirement: Existing PSD workflow compatibility
PSD UI import SHALL keep the existing PSD-to-JSON-to-Cocos workflow and preserve support for normal groups, text layers, PNG layers, and nine-slice naming.

#### Scenario: Normal PSD layers are imported
- **WHEN** a PSD contains normal visible groups, text layers, PNG layers, or nine-slice suffixes
- **THEN** those layers continue to generate the same node types and resource metadata expected by the existing workflow
