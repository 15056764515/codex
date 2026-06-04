# UploadExcel CSV Encoding Tests

Use this guide when fixing CSV upload text that parses into rows but shows garbled Chinese or other non-UTF-8 content.

## Test File

Add or update CSV encoding regressions in:

```text
tests/unit/components/UploadExcel.csv-encoding.spec.js
```

Keep generic suffix validation in `tests/unit/components/UploadExcel.spec.js`.

## Required Steps

1. Use a tiny self-contained byte array or a checked-in fixture. Do not reference files from a user desktop path.
2. Import `TextDecoder` from Node's `util` package and assign `global.TextDecoder` in the spec setup when Jest/jsdom does not provide it.
3. Assert `decodeCsvData(...)` converts GB18030 bytes into readable text. Use Unicode escapes for non-ASCII headers, for example `\u8bbe\u5907\u53f7`.
4. Mock `FileReader` with `jest.spyOn(window, 'FileReader').mockImplementation(...)`.
5. Call `readerData({ name: 'test.csv' })` and assert the `onSuccess` callback receives readable headers and row data.
6. Restore the `FileReader` mock with `mockRestore()` in a `finally` block.

## Parser Expectations

- Decode only `.csv` files before passing text to `XLSX.read(text, { type: 'string' })`.
- Prefer UTF-8 first, preserve UTF-8 BOM behavior, and fallback to `gb18030`.
- Keep `.xlsx` and `.xls` on the binary parsing path.
- If `.csv` is accepted by validation, keep the upload input `accept` attribute in sync.

## Common Failures

- `TextDecoder` is missing in Jest/jsdom: import it from `util` and assign `global.TextDecoder`.
- CSV headers are garbled: make sure bytes are decoded before `XLSX.read(...)`.
- Tests pass alone but fail in a suite: check that `FileReader` mocks are restored.

## Validation

```bash
npx jest tests/unit/components/UploadExcel.csv-encoding.spec.js --runInBand
npx eslint tests/unit/components/UploadExcel.csv-encoding.spec.js
```
