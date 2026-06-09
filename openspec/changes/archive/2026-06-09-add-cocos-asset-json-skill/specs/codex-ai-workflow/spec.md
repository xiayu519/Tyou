## ADDED Requirements

### Requirement: Cocos source asset parsing skill is available
The Codex workflow MUST provide a project skill for Cocos Creator source asset parsing that supports Prefab, Scene, SpriteAtlas, meta uuid, and asset-index inspection without parsing Luban binary tables.

#### Scenario: Cocos asset structure inspection is requested
- **WHEN** Codex needs to inspect or validate `.prefab`, `.scene`, `.meta`, SpriteAtlas `.plist`, or `asset-index.json` structure
- **THEN** Codex routes to `.agents/skills/cocos-asset-json/`
- **AND** it uses the skill's scripts before hand-writing ad hoc parsers when the scripts cover the task

#### Scenario: Luban binary data is encountered
- **WHEN** Codex encounters Luban-generated `.bin` files during Cocos asset parsing work
- **THEN** Codex excludes them from `cocos-asset-json` parsing
- **AND** it routes configuration table work to `luban-dev` and source table data instead

### Requirement: Cocos source asset parser remains read-only by default
The Codex workflow MUST keep reusable Cocos asset parser helpers read-only unless a later OpenSpec change explicitly adds guarded write operations.

#### Scenario: Parser helper is used
- **WHEN** Codex runs `cocos_asset_json.py`
- **THEN** the helper inspects, summarizes, indexes, or validates files without writing project assets

#### Scenario: Asset edit is needed after inspection
- **WHEN** parser output indicates a Prefab, Scene, Atlas, meta, or asset-index edit is needed
- **THEN** Codex follows the corresponding Tyou workflow rule and OpenSpec gate before editing source assets
