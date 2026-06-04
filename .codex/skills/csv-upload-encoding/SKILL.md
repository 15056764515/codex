---
name: csv-upload-encoding
description: Use this skill when changing Vue spreadsheet upload/import parsing in this repository, especially `src/components/UploadExcel/index.vue`, for CSV Chinese/non-UTF-8 mojibake, SheetJS/xlsx date cells or date strings parsing incorrectly, `FileReader` upload behavior, `sheet_to_json` conversion, upload suffix acceptance, or related regression tests. Do not use it for export-only changes or unrelated table display bugs.
---

# Spreadsheet Upload Parsing

## Start Here

1. Identify the real upload parser before editing the display view. Search for `FileReader`, `XLSX.read`, `sheet_to_json`, `readAsArrayBuffer`, `csv`, `cellNF`, `cellDates`, `raw`, and date-normalization helpers.
2. Reproduce with a tiny self-contained sample:
   - CSV mojibake: use explicit GB18030 bytes and assert readable Unicode text.
   - Date parsing: use CSV date strings and/or worksheet cells with Excel serial values plus date formats.
3. Keep changes scoped to upload parsing, file acceptance, normalized results, and regression tests.

## Key Rules

- Keep `.xlsx` and `.xls` on a binary path: `XLSX.read(data, { type: 'array' })`, adding only focused options such as `cellNF: true` when date-format metadata is needed.
- Add text decoding only for `.csv`; decode bytes to text before calling `XLSX.read(text, { type: 'string' })`.
- Prefer UTF-8 first and fallback to `gb18030` for Windows/Chinese CSV exports.
- Preserve UTF-8 BOM handling.
- For CSV date strings, keep or re-read raw CSV text when needed so SheetJS does not turn values like `2024-01-02` into Excel serial numbers before normalization.
- For Excel date cells, convert only cells that are typed as dates or have numeric values with a date format (`XLSX.SSF.is_date(cell.z)`); do not convert ordinary numeric columns.
- Normalize recognized dates to stable strings: `yyyy-mm-dd` for dates and `yyyy-mm-dd HH:mm:ss` for values with time.
- Validate date strings strictly. Reject invalid dates such as `2024-02-31` rather than letting `Date` roll them over.
- If validation accepts `.csv`, ensure the file input `accept` attribute also includes `.csv`.
- Do not depend on desktop attachment paths in tests; use self-contained byte arrays and inline worksheet fixtures.

## Implementation Patterns

Use a CSV branch at the point where bytes enter `xlsx`:

```js
const isCsvFile = this.isCsv(rawFile)
const csvData = isCsvFile ? this.decodeCsvData(data) : null
const workbook = isCsvFile
  ? XLSX.read(csvData, { type: 'string' })
  : XLSX.read(data, { type: 'array', cellNF: true })
```

When fixing CSV date strings, keep a raw CSV parse available for the same sheet:

```js
const rawWorkbook = isCsvFile
  ? XLSX.read(csvData, { type: 'string', raw: true })
  : null
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

Date normalization should be narrow:

```js
if (rawCell && isRecognizedDateString(rawCell.v)) return normalizeDateString(rawCell.v)
if (cell.t === 'd') return formatDateObject(cell.v)
if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
  return formatExcelDateNumber(cell.v, date1904, cell.z)
}
return value
```

Prefer worksheet metadata over column names. Do not infer dates only because a header contains `date`, `time`, or Chinese date labels.

## Test Organization

- Keep generic upload component tests in `tests/unit/components/UploadExcel.spec.js`, such as suffix acceptance for `.xlsx`, `.xls`, `.csv`, and rejected non-spreadsheet files.
- Put CSV encoding tests in `tests/unit/components/UploadExcel.csv-encoding.spec.js`.
- Put date parsing tests in `tests/unit/components/UploadExcel.date.spec.js`.
- For CSV encoding, test both `decodeCsvData(...)` and the `readerData(...)` success callback.
- For date parsing, test CSV date strings, Chinese date strings (`\u5e74`, `\u6708`, `\u65e5`), Excel serial date cells with date formats, date-time cells, string dates, and ordinary numeric columns that must remain numbers.
- Assert readable non-UTF-8 header text using Unicode escapes so specs stay stable on Windows consoles.
- Stub Element UI components and mock `FileReader` with `jest.spyOn(window, 'FileReader').mockImplementation(...)`; restore via `mockRestore()` in `finally`.

## Validation

Run the narrow upload checks first:

```bash
npx jest tests/unit/components/UploadExcel.spec.js tests/unit/components/UploadExcel.csv-encoding.spec.js tests/unit/components/UploadExcel.date.spec.js --runInBand
npx eslint src/components/UploadExcel/index.vue tests/unit/components/UploadExcel.spec.js tests/unit/components/UploadExcel.csv-encoding.spec.js tests/unit/components/UploadExcel.date.spec.js
```

Run `npm run test:unit` when upload parser changes touch shared helpers or multiple components. See `tests/README.md`, `tests/UPLOAD_EXCEL_CSV_ENCODING.md`, and `tests/UPLOAD_EXCEL_DATE_PARSING.md` for the project testing guides.

## Handoff

In the final update, include:

- changed files,
- tests run and results,
- whether `.xlsx/.xls` and `.csv` parsing paths were intentionally kept separate,
- date output format used,
- any manual upload checks not run.
