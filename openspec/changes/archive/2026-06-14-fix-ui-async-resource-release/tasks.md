## 1. UIBase Lifecycle Fix

- [x] 1.1 Add released-state guarding to `UIBase.addAutoReleaseAsset()` so late assets are immediately released and registration success is reported.
- [x] 1.2 Update UIBase sprite helper methods to return `null` when auto-release registration fails after UI release.
- [x] 1.3 Release the loaded atlas when `UIBase.getSpriteFromAtlas()` cannot find the requested SpriteFrame.

## 2. Similar Resource Lifecycle Review

- [x] 2.1 Recheck resource module and lifecycle container paths for similar late-registration or missing-decRef gaps.
- [x] 2.2 Apply same-scope UI/resource lifecycle fixes found during the review and document broader findings that need a separate change.

## 3. Validation

- [x] 3.1 Run OpenSpec status/validation for the change and all specs.
- [x] 3.2 Run focused static checks/searches covering UIBase helpers, resource addRef/decRef pairing, and formatting.
