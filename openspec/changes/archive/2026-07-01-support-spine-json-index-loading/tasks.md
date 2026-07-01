## 1. Baseline

- [x] 1.1 Confirm current Spine helper bypasses indexed logical-name loading and identify similar `loadAssetAsync({ path, type })` usages.
- [x] 1.2 Confirm current `.json` asset index generation maps ordinary JSON to `JsonAsset` and `.skel` to `sp.SkeletonData`.

## 2. Runtime Fix

- [x] 2.1 Update `UIBase.assignSpineAsync()` to load Spine data through the string logical-name path.
- [x] 2.2 Verify owner epoch, request id, assignment, and `decRef` failure paths remain unchanged.

## 3. Asset Index Generation

- [x] 3.1 Add conservative Spine JSON detection to `AssetIndexGenerator.js` using JSON structure plus same-basename atlas and image sidecars.
- [x] 3.2 Keep normal `.json` files on the configured `resourceTypeMap.json` type and keep `.skel` behavior unchanged.

## 4. Documentation

- [x] 4.1 Update the resource API reference with Spine JSON indexing rules and UI Spine logical-name loading guidance.
- [x] 4.2 Update README resource index wording so JSON and Spine JSON behavior are not contradictory.

## 5. Validation

- [x] 5.1 Run static searches proving no remaining equivalent indexed logical-name bypass exists.
- [x] 5.2 Run syntax checks for changed TypeScript/JavaScript files.
- [x] 5.3 Run focused generator logic validation for Spine JSON, ordinary JSON, and `.skel` mapping.
- [x] 5.4 Run OpenSpec validation for `support-spine-json-index-loading`.
