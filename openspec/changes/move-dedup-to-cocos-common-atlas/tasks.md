## 1. OpenSpec artifacts

- [x] 1.1 Create proposal, design, specs, and tasks for moving dedup ownership to Cocos.

## 2. Disable PSD export dedup

- [x] 2.1 Update `Psd2CCC-Digest.jsx` so Photoshop export writes independent PNG files by default.
- [x] 2.2 Keep existing sourceBounds, trimmedSize, scale9 crop, and report behavior unchanged.

## 3. Add Cocos common atlas checker

- [x] 3.1 Implement PNG visible-pixel fingerprinting in `psd2ccc` without fuzzy matching.
- [x] 3.2 Implement SpriteFrame import signature extraction from `.png.meta`.
- [x] 3.3 Add hierarchy menu entry next to `生成UI脚本` and `检查前缀组件`.
- [x] 3.4 Reuse existing common assets or copy a representative PNG into `asset-art/atlas/common`.
- [x] 3.5 Replace SpriteFrame references in the selected node tree and resolvable Prefab assets.
- [x] 3.6 Delete duplicate PNG assets only when project-wide UUID scan confirms they are unreferenced.

## 4. Verification

- [x] 4.1 Build the `psd2ccc` extension.
- [x] 4.2 Verify `TestPsd_HB1_bg1_6c2b` and `TestPsd_HB1_Window_bg_6eb9` are detected as equivalent under the Cocos-side fingerprint.
- [x] 4.3 Verify different SpriteFrame border values or visible pixels are not merged.

## 5. Documentation sync

- [x] 5.1 Sync README PSD workflow so dedup ownership is documented as Cocos-side common atlas checking.
- [x] 5.2 Sync `.ai/rules/tyou-dev/psd2ui-workflow.md` with the hierarchy menu entry, progress feedback, UUID-only replacement, and `*-structure.json` boundary.
