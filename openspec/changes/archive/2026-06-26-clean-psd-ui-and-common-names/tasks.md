## 1. Digest JSON Naming

- [x] 1.1 Update `Psd2CCC-Digest.jsx` so JSON UI-facing `name` strips `.img` and nine-slice tool suffixes.
- [x] 1.2 Add focused naming assertions for PNG `relativePath` and JSON `name` behavior.

## 2. Common Atlas Naming

- [x] 2.1 Update `common-atlas-checker.ts` so newly created common PNGs use source art base names with numeric conflict suffixes.
- [x] 2.2 Rebuild `Client/extensions/psd2ccc/dist` from TypeScript.

## 3. Documentation And Specs

- [x] 3.1 Update PSD workflow reference and README for clean JSON/UI names and art-named common PNGs.
- [x] 3.2 Sync `psd-export-naming` main spec after implementation.

## 4. Validation

- [x] 4.1 Run focused script/static checks and OpenSpec strict validation.
