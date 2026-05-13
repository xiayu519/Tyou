## 1. Diagnose Existing Import

- [x] 1.1 Inspect `TestPsd_dzxq` structure/report output to identify the coordinate and stacking-order mismatch.
- [x] 1.2 Confirm current PSD export rasterizes smart objects before structure traversal.

## 2. Export Script Changes

- [x] 2.1 Update `Psd2CCC-Digest.jsx` so smart objects are not pre-rasterized before traversal.
- [x] 2.2 Add smart object expansion that opens smart object contents, walks internal visible layers, maps bounds back to the parent PSD, and emits a group with children.
- [x] 2.3 Add fallback reporting for smart objects that cannot be expanded.

## 3. Cocos Node Generation Fixes

- [x] 3.1 Fix generated child ordering so foreground PSD layers render above background layers.
- [x] 3.2 Fix child positioning under groups/expanded smart objects using PSD source bounds.

## 4. Validation

- [x] 4.1 Run TypeScript/build validation for `Client/extensions/psd2ccc`.
- [x] 4.2 Run OpenSpec status/validation for `expand-psd-smart-objects`.

## 5. Follow-up Fixes From Photoshop Comparison

- [x] 5.1 Force generated Sprite nodes to render at the JSON/UITransform size instead of raw SpriteFrame size.
- [x] 5.2 Re-run TypeScript/build validation after the Sprite sizing fix.

## 6. Follow-up Fixes From Second Photoshop Comparison

- [x] 6.1 Generate Cocos children in the same order as the PSD/JSON layer list.
- [x] 6.2 Return PNG source bounds from the actual exported visible area after canvas clipping and trim.
- [x] 6.3 Fallback complex smart objects with clipping masks or adjustment layers to PNG to preserve visual fidelity.
- [x] 6.4 Re-run JSX syntax, TypeScript/build, and OpenSpec validation.

## 7. Follow-up Fixes From Layer Order Verification

- [x] 7.1 Restore recursive reverse generation order for every PSD/JSON children array.
- [x] 7.2 Re-run TypeScript/build and OpenSpec validation.

## 8. Follow-up Fixes From Image Group Diagnosis

- [x] 8.1 Export `.img` LayerSet groups as composite PNG nodes instead of decomposed child nodes.
- [x] 8.2 Remove broad smart-object fallback for clipping masks or adjustment layers.
- [x] 8.3 Return group PNG source bounds from the actual visible area after canvas clipping and trim.
- [x] 8.4 Re-run JSX syntax, TypeScript/build, and OpenSpec validation.

## 9. Follow-up Fixes From `.img` and Photoshop Dialog Validation

- [x] 9.1 Suppress Photoshop smart-object content dialogs by defaulting to keep editable layers during export.
- [x] 9.2 Treat any layer or group whose name ends with `.img` as a composite PNG and do not expand its children or smart-object contents.
- [x] 9.3 Update PSD workflow/spec notes for the stricter `.img` rule.
- [x] 9.4 Re-run JSX syntax and OpenSpec validation.

## 10. Follow-up Fixes From Photoshop Unknown Data Dialog Validation

- [x] 10.1 Add a Windows-only watcher that clicks the Photoshop unknown-data `Keep Layers` dialog during export.
- [x] 10.2 Re-run JSX syntax and OpenSpec validation.

## 11. Roll Back Dialog Watcher

- [x] 11.1 Remove the Windows-only unknown-data dialog watcher because it can overload the local machine.
- [x] 11.2 Re-run JSX syntax and OpenSpec validation after rollback.
