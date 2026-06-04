# Testing Guide

## Local Setup

- Install dependencies: `npm install`
- This project uses Vue CLI, Jest, and ESLint.
- No external services are required for the upload Excel/CSV unit tests.

## Quick Checks

- Lint: `npm run lint`
- Unit tests: `npm run test:unit`
- CI-style local check: `npm run test:ci`

## Targeted Tests

- All UploadExcel parser regressions:

```bash
npx jest tests/unit/components/UploadExcel.spec.js tests/unit/components/UploadExcel.csv-encoding.spec.js tests/unit/components/UploadExcel.date.spec.js --runInBand
```

- UploadExcel CSV encoding only:

```bash
npx jest tests/unit/components/UploadExcel.csv-encoding.spec.js --runInBand
```

- UploadExcel date parsing only:

```bash
npx jest tests/unit/components/UploadExcel.date.spec.js --runInBand
```

- Utility tests:

```bash
npx jest tests/unit/utils --runInBand
```

## UploadExcel Guides

- CSV Chinese/non-UTF-8 upload fixes: [UPLOAD_EXCEL_CSV_ENCODING.md](UPLOAD_EXCEL_CSV_ENCODING.md)
- Excel/CSV date parsing fixes: [UPLOAD_EXCEL_DATE_PARSING.md](UPLOAD_EXCEL_DATE_PARSING.md)

## When To Run Full Tests

Run `npm run test:unit` after changing shared utilities, common components, upload parsing behavior, or code used by more than one view.

Run `npm run test:ci` before handing off broad changes that include lint-sensitive code and unit-test updates.

## Required Test Updates

- Bug fixes need a regression test that fails before the fix.
- Upload parser changes need a component unit test with a mocked `FileReader`.
- Tests that assert non-ASCII text should prefer Unicode escapes for stable review on Windows terminals.
- Keep UploadExcel parser test details in the focused guides above instead of expanding this overview.

## Common Failures

- Element UI warnings in shallow component tests: stub components such as `el-button`.
- For UploadExcel CSV encoding and date parsing failures, use the focused guides above.
