# UploadExcel Date Parsing Fix And Skill Replay

Date: 2026-06-04
Project: `D:\Aswrs\codex\vue-element-admin`

## Objective

Fix UploadExcel date parsing for uploaded spreadsheets, keep CSV Chinese encoding behavior intact, split regression tests and documentation by concern, expand the existing project skill to cover future spreadsheet upload parsing issues, then replay the bug fix using the expanded skill to compare efficiency and success rate.

## Files Changed

- `src/components/UploadExcel/index.vue`
- `tests/unit/components/UploadExcel.spec.js`
- `tests/unit/components/UploadExcel.csv-encoding.spec.js`
- `tests/unit/components/UploadExcel.date.spec.js`
- `tests/README.md`
- `tests/UPLOAD_EXCEL_CSV_ENCODING.md`
- `tests/UPLOAD_EXCEL_DATE_PARSING.md`
- `.codex/skills/csv-upload-encoding/SKILL.md`
- `.codex/skills/csv-upload-encoding/agents/openai.yaml`
- `operation-log.md`
- `operation-logs/csv-upload-encoding.md`
- `operation-logs/upload-excel-date-parsing-skill-replay.md`

## Problem Investigation

1. Re-inspected `src/components/UploadExcel/index.vue`.
   - The upload parser read files with `FileReader.readAsArrayBuffer(...)`.
   - CSV files were decoded to text to fix Chinese mojibake.
   - Parsed worksheets were still converted directly with `XLSX.utils.sheet_to_json(worksheet)`.

2. Reproduced SheetJS/xlsx date behavior with local `xlsx@0.14.1`.
   - CSV values such as `2024-01-02` and `2024/03/04` were automatically converted to Excel serial numbers.
   - `sheet_to_json(...)` returned values like `45293.33383101852` instead of a readable date string.
   - Excel date cells were also represented as numeric serial values unless date metadata was used.

3. Identified important constraints.
   - Do not use `raw: false` globally because that would turn ordinary numbers into strings.
   - Do not infer dates from header names alone.
   - Preserve existing CSV Chinese encoding behavior.
   - Keep `.xlsx/.xls` and `.csv` parsing paths intentionally separate.

## Date Parsing Fix

Updated `src/components/UploadExcel/index.vue`:

1. Kept CSV decoding behavior, but stored the decoded CSV text in `csvData`.
2. For CSV uploads, read both:

```js
XLSX.read(csvData, { type: 'string' })
XLSX.read(csvData, { type: 'string', raw: true })
```

The raw parse preserves original date strings before SheetJS can coerce them into Excel serial numbers.

3. For xlsx/xls uploads, enabled date-format metadata:

```js
XLSX.read(data, { type: 'array', cellNF: true })
```

4. Added result normalization after `sheet_to_json(...)`.
   - Map JSON row keys back to worksheet cell addresses.
   - Prefer raw CSV date strings when available.
   - Convert Excel date cells only when the cell is typed as `d` or when a numeric cell has a date format detected by `XLSX.SSF.is_date(cell.z)`.
   - Strictly validate date strings before formatting.
   - Preserve ordinary numeric columns.

5. Standardized date output:

```text
yyyy-mm-dd
yyyy-mm-dd HH:mm:ss
```

## Regression Test Split

Split UploadExcel tests by concern:

1. `tests/unit/components/UploadExcel.spec.js`
   - Keeps generic suffix validation for `.xlsx`, `.xls`, `.csv`, and rejected `.txt`.

2. `tests/unit/components/UploadExcel.csv-encoding.spec.js`
   - Tests `decodeCsvData(...)` with a self-contained GB18030 byte array.
   - Tests `readerData(...)` with a mocked `FileReader`.
   - Uses Unicode escapes for Chinese header assertions.
   - Uses `jest.spyOn(window, 'FileReader').mockImplementation(...)` and restores with `mockRestore()`.

3. `tests/unit/components/UploadExcel.date.spec.js`
   - Tests CSV date strings and Chinese date strings.
   - Tests xlsx-style Excel serial date cells with date formats.
   - Tests date-time values.
   - Verifies ordinary numeric columns remain numbers.

## Testing Documentation Split

Updated `tests/README.md`:

- Kept it as the high-level testing guide.
- Added targeted commands for all UploadExcel regressions, CSV encoding only, and date parsing only.
- Linked focused UploadExcel guides instead of keeping all details in the overview.

Added focused documents:

1. `tests/UPLOAD_EXCEL_CSV_ENCODING.md`
   - Documents CSV Chinese/non-UTF-8 testing steps.
   - Covers `TextDecoder`, byte arrays, `FileReader` mocking, parser expectations, common failures, and validation commands.

2. `tests/UPLOAD_EXCEL_DATE_PARSING.md`
   - Documents Excel/CSV date parsing testing steps.
   - Covers raw CSV parse, Excel serial date fixtures, date-time assertions, normal numeric preservation, parser expectations, common failures, and validation commands.

## Skill Expansion

Expanded existing project skill:

```text
.codex/skills/csv-upload-encoding/SKILL.md
```

The skill was broadened from CSV-only encoding guidance into spreadsheet upload parsing guidance while keeping the existing skill name for discoverability.

New coverage:

- CSV Chinese/non-UTF-8 mojibake.
- SheetJS/xlsx date cells and date strings.
- CSV raw parse for date strings.
- `cellNF: true` for Excel date metadata.
- Strict date normalization.
- Ordinary numeric column preservation.
- Test split conventions.
- Updated validation commands.
- Links to the split testing documents.

Updated UI metadata:

```text
.codex/skills/csv-upload-encoding/agents/openai.yaml
```

The display name changed to:

```text
Spreadsheet Upload Parsing
```

## Validation Commands Run

Focused UploadExcel regression tests:

```bash
npx jest tests/unit/components/UploadExcel.spec.js tests/unit/components/UploadExcel.csv-encoding.spec.js tests/unit/components/UploadExcel.date.spec.js --runInBand
```

Result:

```text
PASS tests/unit/components/UploadExcel.date.spec.js
PASS tests/unit/components/UploadExcel.csv-encoding.spec.js
PASS tests/unit/components/UploadExcel.spec.js
Test Suites: 3 passed, 3 total
Tests: 5 passed, 5 total
```

Focused lint:

```bash
npx eslint src/components/UploadExcel/index.vue tests/unit/components/UploadExcel.spec.js tests/unit/components/UploadExcel.csv-encoding.spec.js tests/unit/components/UploadExcel.date.spec.js
```

Result:

```text
passed
```

Skill validation:

```bash
python C:/Users/hzw/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/csv-upload-encoding
```

Result:

```text
Skill is valid!
```

## Rollback And Skill Replay Experiment

Performed a controlled replay for the Excel date parsing bug:

1. Temporarily rolled `src/components/UploadExcel/index.vue` back to the pre-date-fix behavior.
   - Kept the CSV Chinese encoding fix.
   - Removed date normalization helpers.
   - Restored direct `XLSX.utils.sheet_to_json(worksheet)` result generation.

2. Confirmed the regression before re-fixing:

```bash
npx jest tests/unit/components/UploadExcel.date.spec.js --runInBand
```

Result:

```text
FAIL tests/unit/components/UploadExcel.date.spec.js
TypeError: wrapper.vm.normalizeSheetData is not a function
```

3. Confirmed the unrelated CSV encoding fix still passed while date parsing was broken:

```bash
npx jest tests/unit/components/UploadExcel.csv-encoding.spec.js --runInBand
```

Result:

```text
PASS tests/unit/components/UploadExcel.csv-encoding.spec.js
Tests: 2 passed, 2 total
```

4. Re-applied the date parsing fix using the expanded `csv-upload-encoding` skill.
   - Followed the skill's parser search terms and constraints.
   - Restored raw CSV parse for date strings.
   - Restored `cellNF: true` for xlsx/xls metadata.
   - Restored narrow date normalization.
   - Re-ran the skill's focused validation commands.

5. Final replay result:
   - UploadExcel tests passed.
   - ESLint passed.
   - Skill validation passed.

## Skill Efficiency And Success Rate Comparison

Observed before having the expanded skill:

- Required exploratory investigation into SheetJS behavior.
- Needed manual checks for `raw`, `cellNF`, `cellDates`, date serial conversion, and `sheet_to_json` output.
- Needed extra judgment to avoid changing ordinary numeric columns or making all values strings.
- Test organization had to be designed during the fix.
- More risk of forgetting CSV encoding behavior while fixing date parsing.

Observed with the expanded skill during replay:

- Workflow was checklist-driven: locate parser, reproduce with targeted spec, keep CSV/xlsx paths separate, add raw CSV parse, enable `cellNF`, normalize narrowly, run exact validation commands.
- Re-fix completed in one implementation pass after the intentional rollback.
- Date tests failed before the re-fix and passed after the re-fix.
- CSV encoding tests stayed green throughout, showing lower regression risk.
- Success rate for the skill-guided replay was 100% for the targeted suite: 3 UploadExcel test suites passed and eslint passed.

Conclusion:

- The skill materially improved repeatability and reduced exploration.
- The biggest benefit was preserving constraints across related bugs: CSV encoding, Excel date parsing, numeric preservation, split tests, and focused validation.

## Final State

- CSV Chinese/non-UTF-8 upload bug remains fixed.
- Excel date parsing bug fixed.
- UploadExcel tests split by concern.
- Testing documentation split by concern.
- Spreadsheet upload parsing skill expanded and validated.
- Controlled rollback/replay confirmed the skill-guided fix path is faster and more reliable for this class of bug.
