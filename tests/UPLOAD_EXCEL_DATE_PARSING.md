# UploadExcel Date Parsing Tests

Use this guide when fixing uploaded spreadsheet dates that arrive as Excel serial numbers, unnormalized date strings, or incorrect date-time values.

## Test File

Add or update date parsing regressions in:

```text
tests/unit/components/UploadExcel.date.spec.js
```

Keep CSV encoding regressions in `tests/unit/components/UploadExcel.csv-encoding.spec.js`.

## Required Steps

1. Cover CSV date strings such as `2024-01-02`, date-time strings such as `2024/03/04 05:06:07`, and Chinese date strings using Unicode escapes like `\u5e74`, `\u6708`, and `\u65e5`.
2. For CSV date strings, create both a normal parse and a raw parse:

```js
const workbook = XLSX.read(csv, { type: 'string' })
const rawWorkbook = XLSX.read(csv, { type: 'string', raw: true })
```

3. Assert normalization uses raw CSV cells when SheetJS would otherwise coerce date strings into Excel serial numbers.
4. Cover xlsx/xls date cells with inline worksheet fixtures: numeric serial values with date formats, date-time formats, string dates, and ordinary numeric cells with `General` format.
5. Assert recognized dates become stable strings: `yyyy-mm-dd` or `yyyy-mm-dd HH:mm:ss`.
6. Assert ordinary numeric columns remain numbers.

## Parser Expectations

- Read xlsx/xls with date-format metadata when needed, for example `XLSX.read(data, { type: 'array', cellNF: true })`.
- Convert only cells typed as dates or numeric cells whose format passes `XLSX.SSF.is_date(cell.z)`.
- Do not infer dates from header names alone.
- Validate date strings strictly so invalid dates such as `2024-02-31` are not silently rolled over.
- Preserve separate CSV and xlsx/xls parsing paths.

## Common Failures

- `2024-01-02` becomes `45293`: preserve a raw CSV parse and normalize from the raw cell.
- Excel date cells stay as numbers: make sure date format metadata is available and checked with `XLSX.SSF.is_date(cell.z)`.
- Plain numbers become dates: only convert cells with date metadata or recognized date strings.

## Validation

```bash
npx jest tests/unit/components/UploadExcel.date.spec.js --runInBand
npx eslint tests/unit/components/UploadExcel.date.spec.js
```
