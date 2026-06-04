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

- Upload Excel/CSV parser regression:

```bash
npx jest tests/unit/components/UploadExcel.spec.js --runInBand
```

- Utility tests:

```bash
npx jest tests/unit/utils --runInBand
```

## When To Run Full Tests

Run `npm run test:unit` after changing shared utilities, common components, upload parsing behavior, or code used by more than one view.

Run `npm run test:ci` before handing off broad changes that include lint-sensitive code and unit-test updates.

## Required Test Updates

- Bug fixes need a regression test that fails before the fix.
- Upload parser changes need a component unit test with a mocked `FileReader`.
- Encoding fixes should use byte arrays or fixtures checked into the repo, not user desktop paths.
- Tests that assert non-ASCII text should prefer Unicode escapes for stable review on Windows terminals.

## Common Failures

- `TextDecoder` is missing in Jest/jsdom: import it from Node's `util` package and assign `global.TextDecoder`.
- Element UI warnings in shallow component tests: stub components such as `el-button`.
- CSV text parses into rows but headers are garbled: ensure CSV bytes are decoded to text before `XLSX.read(..., { type: 'string' })`.
