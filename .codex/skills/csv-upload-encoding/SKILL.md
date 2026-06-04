---
name: csv-upload-encoding
description: Use this skill when changing Vue spreadsheet upload/import code in this repository where CSV files parse into rows but non-UTF-8 text is garbled. It covers FileReader plus xlsx/sheetjs parsing, CSV-only decoding, regression tests, and validation commands. Do not use it for export-only changes or unrelated table display bugs.
---

# CSV Upload Encoding

## Start Here

1. Identify the real upload parser before editing the display view. Search for `FileReader`, `XLSX.read`, `sheet_to_json`, `readAsArrayBuffer`, and `csv`.
2. Reproduce the failure with a tiny CSV byte sample or the user-provided file. If `.xlsx` works but `.csv` has mojibake, suspect a text encoding issue.
3. Keep the change scoped to upload parsing, file acceptance, and regression tests.

## Key Rules

- Keep `.xlsx` and `.xls` on the existing binary path: `XLSX.read(data, { type: 'array' })`.
- Add decoding only for `.csv`; decode bytes to text before calling `XLSX.read(text, { type: 'string' })`.
- Prefer UTF-8 first and fallback to `gb18030` for Windows/Chinese CSV exports.
- Preserve UTF-8 BOM handling.
- If validation accepts `.csv`, ensure the file input `accept` attribute also includes `.csv`.
- Do not depend on desktop attachment paths in tests; use self-contained byte arrays.

## Implementation Pattern

Use a CSV branch at the point where bytes enter `xlsx`:

```js
const workbook = this.isCsv(rawFile)
  ? XLSX.read(this.decodeCsvData(data), { type: 'string' })
  : XLSX.read(data, { type: 'array' })
```

Use a small decoder helper:

```js
decodeCsvData(data) {
  if (typeof TextDecoder === 'undefined') return data

  if (this.hasUtf8Bom(data)) {
    return new TextDecoder('utf-8').decode(data)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch (e) {
    return new TextDecoder('gb18030').decode(data)
  }
}
```

## Test Requirements

- Add or update `tests/unit/components/UploadExcel.spec.js` for upload parser changes.
- Test both `decodeCsvData(...)` and the `readerData(...)` success callback.
- Assert readable non-UTF-8 header text using Unicode escapes so the spec stays stable on Windows consoles.
- Stub Element UI components and mock `FileReader`; restore globals after the test.
- Keep a suffix test for `.xlsx`, `.xls`, `.csv`, and a rejected non-spreadsheet file.

## Validation

Run the narrow check first, then broader project checks:

```bash
npx jest tests/unit/components/UploadExcel.spec.js --runInBand
npm run lint -- --quiet
```

Run `npm run test:unit` when upload parser changes touch shared helpers or multiple components. See `tests/README.md` for the project testing guide.

## Handoff

In the final update, include:
- changed files,
- tests run and results,
- whether `.xlsx/.xls` parsing was intentionally left unchanged,
- any manual upload checks not run.
