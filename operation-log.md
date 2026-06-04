# Operation Log

Date: 2026-06-04
Project: `D:\Aswrs\codex\vue-element-admin`

## Objective

Fix CSV upload mojibake for Chinese/non-UTF-8 CSV files, add regression tests, create a reusable Codex skill, and update the skill/test deliverables according to `Skill Guide-领域专家.pdf`.

## Files Changed

- `src/components/UploadExcel/index.vue`
- `tests/unit/components/UploadExcel.spec.js`
- `tests/README.md`
- `.codex/skills/csv-upload-encoding/SKILL.md`
- `.codex/skills/csv-upload-encoding/agents/openai.yaml`
- `operation-log.md`

## Problem Investigation

1. Checked `src/views/excel/upload-excel.vue`.
   - Found it only receives parsed results and renders an Element UI table.
   - The real parsing logic lives in `src/components/UploadExcel/index.vue`.

2. Inspected `src/components/UploadExcel/index.vue`.
   - Original parser used `FileReader.readAsArrayBuffer(...)`.
   - All uploads were passed to `XLSX.read(data, { type: 'array' })`.
   - This worked for `.xlsx`, but caused CSV text encoded as GBK/GB18030 to be interpreted incorrectly.

3. Confirmed failing CSV encoding from `C:/Users/hzw/Desktop/测试csv.csv`.
   - Initial bytes included `201, 232, 177, 184, 186, 197`, equivalent to hex `C9 E8 B1 B8 BA C5`.
   - Those bytes indicate GBK/GB18030 Chinese text rather than UTF-8.

4. Reproduced pre-fix behavior with `xlsx`.
   - Reading GB18030 CSV bytes as `type: 'array'` produced a garbled header like `Éè±¸ºÅ`.

## Code Fix

Updated `src/components/UploadExcel/index.vue`:

1. Added `.csv` to the file input `accept` attribute.
2. Kept `.xlsx` and `.xls` on the existing binary parsing path:

```js
XLSX.read(data, { type: 'array' })
```

3. Added a CSV-only parsing path:

```js
const workbook = this.isCsv(rawFile)
  ? XLSX.read(this.decodeCsvData(data), { type: 'string' })
  : XLSX.read(data, { type: 'array' })
```

4. Added CSV decoding helpers:
   - UTF-8 BOM detection.
   - UTF-8 decoding first.
   - `gb18030` fallback for Windows/Chinese CSV exports.

5. Added `reader.onerror` handling to stop loading and reject the read promise on file read errors.

## Regression Tests

Added `tests/unit/components/UploadExcel.spec.js`.

Coverage:

1. `decodeCsvData(...)` decodes GB18030 bytes into readable Chinese text.
2. `readerData(...)` with a mocked `FileReader` returns readable table headers and rows.
3. File suffix validation accepts `.xlsx`, `.xls`, `.csv`, and rejects `.txt`.

Test implementation notes:

- Uses a self-contained GB18030 byte array, not a desktop file path.
- Uses `TextDecoder` from Node's `util` package in Jest/jsdom.
- Uses Unicode escapes for the Chinese header to avoid Windows console encoding issues.
- Stubs `el-button` to avoid Element UI warnings.

## Testing Guide

Added `tests/README.md` according to the domain expert guide.

It documents:

- Local setup command.
- Quick checks.
- Targeted test command for upload parser regression.
- When to run full tests.
- Required test updates for bug fixes and upload parser changes.
- Common failure causes and fixes.

## Skill Creation And Update

Created/updated project skill:

```text
.codex/skills/csv-upload-encoding/SKILL.md
```

The skill now follows the PDF guide requirements:

- Clear `name` and trigger-focused `description`.
- Specific task scope and non-applicable cases.
- Short executable workflow.
- Project-specific rules.
- Validation commands.
- Handoff checklist.

Skill metadata:

```text
.codex/skills/csv-upload-encoding/agents/openai.yaml
```

Also cleaned up an empty nested directory left by the initial skill scaffold.

## Validation Commands Run

Targeted unit test:

```bash
npx jest tests/unit/components/UploadExcel.spec.js --runInBand
```

Result:

```text
PASS tests/unit/components/UploadExcel.spec.js
Tests: 3 passed, 3 total
```

Lint:

```bash
npm run lint -- --quiet
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

Manual decoding check:

```text
GB18030 CSV bytes parsed to headers: 设备号, SN
```

## Skill Before/After Experiment

Performed a controlled replay:

1. Reverted the CSV fix back to the original bug state.
2. Confirmed the bug reappeared: the CSV header decoded as mojibake.
3. Re-applied the fix using the generated `csv-upload-encoding` skill.
4. Ran the targeted tests and lint successfully.

Observation:

- Without the skill, the work required exploratory search, manual encoding confirmation, and one Jest environment adjustment.
- With the skill, the steps were direct: locate parser, confirm CSV encoding, keep Excel binary path unchanged, add CSV-only decoding, add self-contained tests, validate.
- In this single-task replay, the skill improved repeatability and reduced risk of missing `accept=".csv"`, changing `.xlsx/.xls` behavior, or writing tests that depend on local files.

## Git Status Note

Attempted to create branch `uploadingCSV` and commit with message:

```text
Fix the encoding issue when uploading CSV files
```

This could not be completed because the project directory was not a Git repository:

```text
fatal: not a git repository (or any of the parent directories): .git
```

## Final State

- CSV upload encoding bug fixed.
- Regression unit test added and passing.
- Project testing guide added.
- Project skill created/updated according to the domain expert PDF.
- Skill validation passing.
