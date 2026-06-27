## ADDED Requirements

### Requirement: 顶部 Tools 全量公共图集整理

PSD Cocos 扩展 SHALL expose a top-level `Tools -> 检查所有公共图集` command that scans PNG assets under `assets/asset-art/atlas`, builds a selectable plan, and executes selected items through the shared common atlas checker.

#### Scenario: 打开全量整理面板
- **WHEN** 用户执行 `Tools -> 检查所有公共图集`
- **THEN** 扩展 SHALL open a panel listing candidate source PNGs, target common assets, and related Prefab or Scene node references
- **THEN** candidate items SHALL be selectable before execution

#### Scenario: 执行勾选整理
- **WHEN** 用户在全量整理面板中确认执行勾选项
- **THEN** 扩展 SHALL reuse the same content fingerprint, SpriteFrame import semantics, UUID replacement, and safe deletion logic used by node-level public atlas checking
- **THEN** 扩展 MUST NOT maintain a second independent atlas deduplication algorithm

### Requirement: 顶部 Tools 冗余图片清理

PSD Cocos 扩展 SHALL expose a top-level `Tools -> 检查冗余图片` command that lists redundant non-common PNG assets already equivalent to common atlas assets and deletes only user-selected assets that pass UUID reference safety checks.

#### Scenario: 打开冗余清理面板
- **WHEN** 用户执行 `Tools -> 检查冗余图片`
- **THEN** 扩展 SHALL open a panel listing redundant PNG candidates and their matching common atlas assets
- **THEN** candidate items SHALL be selectable before deletion

#### Scenario: 安全清理冗余图片
- **WHEN** 用户在冗余清理面板中确认删除勾选项
- **THEN** 扩展 SHALL delete only assets whose image UUID and SpriteFrame UUID have no remaining references under `assets/`
- **THEN** assets with remaining references SHALL be skipped and reported instead of being deleted
