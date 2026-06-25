## ADDED Requirements

### Requirement: m_list uses a fixed ListView instance structure
The PSD-to-UI editor workflow SHALL treat a node named with the `m_list` prefix as a Tyou `ListView` and MUST convert its subtree into the fixed usable instance structure required by the runtime.

#### Scenario: m_list structure is repaired
- **WHEN** prefix checking runs on a UI subtree containing `m_listRewards` with exactly one descendant named with the `m_item` prefix
- **THEN** the workflow ensures `m_listRewards` has `cc.UITransform`, `cc.ScrollView`, `cc.Mask`, and `pkg:ListView`
- **AND** the workflow ensures a `content` child with `cc.UITransform` and `cc.Layout` exists
- **AND** the workflow aligns `content` to the top of the list viewport with top-center anchoring
- **AND** the workflow moves or keeps the `m_item` node under `content` while preserving its subtree
- **AND** the workflow assigns `ScrollView.content` and `ListView.tmpNode` so the list can run without manual reference dragging

#### Scenario: m_item is missing
- **WHEN** prefix checking runs on a UI subtree containing an `m_list` node without a serving `m_item` template
- **THEN** the workflow MUST show an actionable editor error for that `m_list`
- **AND** the workflow MUST NOT report the list as fully fixed

#### Scenario: m_item is duplicated
- **WHEN** prefix checking finds more than one `m_item` template serving the same `m_list`
- **THEN** the workflow MUST show an actionable editor error that names the affected `m_list`
- **AND** the workflow MUST NOT silently choose one of the templates

### Requirement: m_item generates an item widget script
The UI script generation workflow SHALL generate a dedicated item/widget script for every valid `m_list + m_item` pair.

#### Scenario: item widget class name is generated from m_item
- **WHEN** UI script generation processes `m_listContent/content/m_itemContent`
- **THEN** the generated item widget script class name is `ItemContent`
- **AND** the script file is `Client/assets/scripts/logic/ui/widget/ItemContent.ts`

#### Scenario: generated item widget class name is duplicated
- **WHEN** UI script generation finds two list item templates that would both generate the same item widget class name
- **THEN** the workflow MUST stop script generation with an actionable duplicate-name error
- **AND** it MUST NOT silently bind two lists to the same generated item class

#### Scenario: item script directory is absent
- **WHEN** prefix checking or UI script generation processes a valid `m_list + m_item` pair and `Client/assets/scripts/logic/ui/widget/` does not exist
- **THEN** the workflow creates the `widget` directory
- **AND** it writes the generated item widget script under that directory

#### Scenario: prefix checking generates item widget script
- **WHEN** prefix checking finishes normalizing a UI subtree containing `m_listContent/content/m_itemContent`
- **THEN** the workflow generates or safely detects `Client/assets/scripts/logic/ui/widget/ItemContent.ts`
- **AND** it updates widget side-effect imports
- **AND** it does not generate standalone prefab widget scripts during prefix checking

#### Scenario: parent UI script is generated
- **WHEN** UI script generation processes a UI root containing `m_listRewards/content/m_itemReward`
- **THEN** the parent UI script binds `m_listRewards` as `ListView`
- **AND** the parent UI script imports the generated item widget class
- **AND** the parent UI script registers that item widget class with the corresponding `ListView`
- **AND** the parent UI script does not generate fields for nodes inside `m_itemReward`

#### Scenario: item script already exists
- **WHEN** UI script generation would create an item widget script whose file already exists
- **THEN** the workflow MUST NOT silently overwrite that file
- **AND** it MUST provide the regenerated binding content through the same safe update path used by existing UI script generation

### Requirement: dynamic widget scripts are supported
The UI script generation workflow SHALL support generating standalone `UIWidget` scripts for dynamically loaded prefab widgets.
For this workflow, a widget marker is a case-insensitive `Widget` substring.

#### Scenario: dynamic widget script is generated
- **WHEN** the developer invokes the widget-script generation action on a selected prefab or node whose name contains a widget marker
- **THEN** the workflow writes a script that extends `UIWidget`
- **AND** the child widget script is generated under `Client/assets/scripts/logic/ui/widget/`
- **AND** the generated class/file name matches the prefab or node name after normal TypeScript identifier sanitization
- **AND** the generated standalone prefab widget script does not include an empty `onRecycle()` override by default
- **AND** the workflow does not update `UIName` for that widget script

#### Scenario: dynamic widget name is invalid
- **WHEN** the developer invokes the widget-script generation action on a selected prefab or node whose name does not contain a widget marker
- **THEN** the workflow MUST show an actionable warning
- **AND** it MUST NOT generate a standalone widget script for that selection

#### Scenario: widget side-effect imports are generated
- **WHEN** the workflow generates or detects widget scripts under `Client/assets/scripts/logic/ui/widget/`
- **THEN** it regenerates `WidgetImportAll.ts` with side-effect imports for widget scripts
- **AND** `UIImportAll.ts` imports `widget/WidgetImportAll`
- **AND** widget import generation MUST NOT require widget scripts to import `UIName` or parent UI scripts

#### Scenario: list item remains a widget boundary
- **WHEN** UI script generation processes `m_item` under an `m_list`
- **THEN** the `m_item` subtree follows child-binding isolation rules for list item widgets
- **AND** the item widget is owned and refreshed by the `ListView` lifecycle rather than as a single static child widget instance
- **AND** the generated item widget script includes the `onRecycle()` hook for list reuse cleanup
