---
name: csv-upload-encoding
description: Use when fixing spreadsheet upload/import code where CSV files parse structurally but show mojibake or garbled Chinese/non-UTF-8 text, especially browser FileReader plus xlsx/sheetjs workflows. Guides diagnosis of file encoding, CSV-only decoding changes, and focused regression tests without breaking xlsx/xls uploads.
---

# CSV Upload Encoding

## When To Use

Use this skill when an app can upload spreadsheets, `.xlsx`/`.xls` parse correctly, but `.csv` uploads show garbled Chinese or other non-UTF-8 text in headers or table cells.

Typical signs:
- Code reads every spreadsheet with `FileReader.readAsArrayBuffer(...)` and passes bytes directly to `XLSX.read(..., { type: 'array' })`.
- CSV files exported from Windows tools or Chinese-language systems contain GBK/GB18030 bytes.
- The table shape and row count are correct, but text looks like mojibake.

## Workflow

1. Locate the real parser, not only the view that displays results.
   Search for `FileReader`, `XLSX.read`, `sheet_to_json`, `csv`, `readAsArrayBuffer`, and upload components.

2. Confirm the file encoding.
   Inspect the first bytes of the failing CSV. For example, byte sequences such as `C9 E8 B1 B8 BA C5` in Chinese CSV exports are often GBK/GB18030, not UTF-8.

3. Keep binary Excel parsing unchanged.
   `.xlsx` and `.xls` should continue using `ArrayBuffer` and `XLSX.read(data, { type: 'array' })`.

4. Add a CSV-only decoding path.
   Decode CSV bytes to text, then pass the text to `XLSX.read(text, { type: 'string' })`.
   Prefer UTF-8 first, then fallback to `gb18030`. Preserve UTF-8 BOM handling.

5. Update upload file acceptance if needed.
   If validation allows `.csv` but the file input `accept` omits `.csv`, add it.

6. Add focused regression tests.
   Use hardcoded GB18030 bytes for a tiny CSV so tests do not depend on a user desktop path.

## Implementation Pattern

For browser-based Vue upload components, a compact pattern is:

```js
const workbook = this.isCsv(rawFile)
  ? XLSX.read(this.decodeCsvData(data), { type: 'string' })
  : XLSX.read(data, { type: 'array' })
```

```js
decodeCsvData(data) {
  if (typeof TextDecoder === 'undefined') {
    return data
  }

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

Use a case-insensitive CSV check:

```js
isCsv(file) {
  return /\.csv$/i.test(file.name)
}
```

## Testing Pattern

Add tests that verify both the decoder and the upload flow:

- `decodeCsvData(gb18030Bytes.buffer)` returns readable Chinese text rather than mojibake.
- `readerData({ name: 'test.csv' })` emits readable headers and `sheet_to_json` results.
- `.xlsx`, `.xls`, and `.csv` suffixes are allowed; unrelated suffixes are rejected.

In Jest/jsdom, import `TextDecoder` from Node's `util` package if the browser global is missing:

```js
import { TextDecoder } from 'util'

beforeAll(() => {
  global.TextDecoder = TextDecoder
})
```

Keep tests self-contained with byte arrays instead of external files:

```js
const gb18030CsvBytes = Uint8Array.from([
  0xC9, 0xE8, 0xB1, 0xB8, 0xBA, 0xC5, 0x2C, 0x53, 0x4E
])
```

## Validation

Run the smallest targeted test first, then lint:

```bash
npx jest tests/unit/components/UploadExcel.spec.js --runInBand
npm run lint -- --quiet
```

If the app has browser coverage or a local upload flow, manually upload both a known-good `.xlsx` and the failing `.csv` to confirm the table output.
