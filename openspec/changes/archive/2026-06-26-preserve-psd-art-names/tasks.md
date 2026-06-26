## 1. Digest Naming

- [x] 1.1 Update `Psd2CCC-Digest.jsx` so PSD atlas folders use the PSD base name without Chinese-to-English conversion.
- [x] 1.2 Update `Psd2CCC-Digest.jsx` so exported PNG names use the image layer base name, strip only tool suffixes such as `_9s...`, and resolve duplicates with trailing numbers.

## 2. Editor Helper Alignment

- [x] 2.1 Update `psd-legacy.ts` and generated `dist/psd-legacy.js` so editor-side legacy prefix lookup no longer converts Chinese PSD names to pinyin.

## 3. Documentation And Specs

- [x] 3.1 Update Tyou PSD workflow reference with the new art-name preservation rules and unchanged `common` naming rule.
- [x] 3.2 Update `README.md` PSD export notes so they no longer describe Chinese-to-pinyin naming.

## 4. Validation

- [x] 4.1 Run focused syntax/static checks for changed scripts and OpenSpec validation.
