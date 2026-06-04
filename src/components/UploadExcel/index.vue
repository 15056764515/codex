<template>
  <div>
    <input ref="excel-upload-input" class="excel-upload-input" type="file" accept=".xlsx, .xls, .csv" @change="handleClick">
    <div class="drop" @drop="handleDrop" @dragover="handleDragover" @dragenter="handleDragover">
      Drop excel file here or
      <el-button :loading="loading" style="margin-left:16px;" size="mini" type="primary" @click="handleUpload">
        Browse
      </el-button>
    </div>
  </div>
</template>

<script>
import XLSX from 'xlsx'

export default {
  props: {
    beforeUpload: Function, // eslint-disable-line
    onSuccess: Function// eslint-disable-line
  },
  data() {
    return {
      loading: false,
      excelData: {
        header: null,
        results: null
      }
    }
  },
  methods: {
    generateData({ header, results }) {
      this.excelData.header = header
      this.excelData.results = results
      this.onSuccess && this.onSuccess(this.excelData)
    },
    handleDrop(e) {
      e.stopPropagation()
      e.preventDefault()
      if (this.loading) return
      const files = e.dataTransfer.files
      if (files.length !== 1) {
        this.$message.error('Only support uploading one file!')
        return
      }
      const rawFile = files[0] // only use files[0]

      if (!this.isExcel(rawFile)) {
        this.$message.error('Only supports upload .xlsx, .xls, .csv suffix files')
        return false
      }
      this.upload(rawFile)
      e.stopPropagation()
      e.preventDefault()
    },
    handleDragover(e) {
      e.stopPropagation()
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    handleUpload() {
      this.$refs['excel-upload-input'].click()
    },
    handleClick(e) {
      const files = e.target.files
      const rawFile = files[0] // only use files[0]
      if (!rawFile) return
      this.upload(rawFile)
    },
    upload(rawFile) {
      this.$refs['excel-upload-input'].value = null // fix can't select the same excel

      if (!this.beforeUpload) {
        this.readerData(rawFile)
        return
      }
      const before = this.beforeUpload(rawFile)
      if (before) {
        this.readerData(rawFile)
      }
    },
    readerData(rawFile) {
      this.loading = true
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          const data = e.target.result
          const isCsvFile = this.isCsv(rawFile)
          const csvData = isCsvFile ? this.decodeCsvData(data) : null
          const workbook = isCsvFile
            ? XLSX.read(csvData, { type: 'string' })
            : XLSX.read(data, { type: 'array', cellNF: true })
          const rawWorkbook = isCsvFile
            ? XLSX.read(csvData, { type: 'string', raw: true })
            : null
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rawWorksheet = rawWorkbook ? rawWorkbook.Sheets[firstSheetName] : null
          const header = this.getHeaderRow(worksheet)
          const results = this.normalizeSheetData(worksheet, rawWorksheet, this.isDate1904(workbook))
          this.generateData({ header, results })
          this.loading = false
          resolve()
        }
        reader.onerror = error => {
          this.loading = false
          reject(error)
        }
        reader.readAsArrayBuffer(rawFile)
      })
    },
    normalizeSheetData(sheet, rawSheet, date1904) {
      const results = XLSX.utils.sheet_to_json(sheet)
      const headerMap = this.getJsonHeaderMap(sheet)

      results.forEach(row => {
        const rowIndex = row.__rowNum__

        Object.keys(row).forEach(key => {
          const columnIndex = headerMap[key]
          if (columnIndex === undefined) return

          const cellAddress = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex })
          const cell = sheet[cellAddress]
          const rawCell = rawSheet ? rawSheet[cellAddress] : null
          row[key] = this.normalizeCellValue(row[key], cell, rawCell, date1904)
        })
      })

      return results
    },
    normalizeCellValue(value, cell, rawCell, date1904) {
      const rawDate = rawCell && this.normalizeDateString(rawCell.v)
      if (rawDate) {
        return rawDate
      }

      if (cell && this.isDateCell(cell)) {
        return cell.t === 'd'
          ? this.formatDateObject(cell.v)
          : this.formatExcelDateNumber(cell.v, date1904, cell.z)
      }

      const stringDate = this.normalizeDateString(value)
      if (stringDate) {
        return stringDate
      }

      return value
    },
    normalizeDateString(value) {
      if (typeof value !== 'string') {
        return null
      }

      const dateMatch = value.match(/^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?\s*$/)
      const cnDateMatch = value.match(/^\s*(\d{4})\u5e74(\d{1,2})\u6708(\d{1,2})\u65e5?(?:\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?\s*$/)
      const match = dateMatch || cnDateMatch

      if (!match) {
        return null
      }

      const parts = {
        y: Number(match[1]),
        m: Number(match[2]),
        d: Number(match[3]),
        H: Number(match[4] || 0),
        M: Number(match[5] || 0),
        S: Number(match[6] || 0)
      }
      const date = new Date(parts.y, parts.m - 1, parts.d, parts.H, parts.M, parts.S)

      if (
        date.getFullYear() !== parts.y ||
        date.getMonth() + 1 !== parts.m ||
        date.getDate() !== parts.d ||
        date.getHours() !== parts.H ||
        date.getMinutes() !== parts.M ||
        date.getSeconds() !== parts.S
      ) {
        return null
      }

      return this.formatDateParts(parts, Boolean(match[4]))
    },
    isDateCell(cell) {
      if (cell.t === 'd') {
        return cell.v instanceof Date
      }

      return cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)
    },
    formatExcelDateNumber(value, date1904, format) {
      const date = XLSX.SSF.parse_date_code(value, { date1904 })
      if (!date) {
        return value
      }

      if (!this.isDateTimeFormat(format)) {
        date.H = 0
        date.M = 0
        date.S = 0
      }

      return this.formatDateParts(date, this.isDateTimeFormat(format))
    },
    isDateTimeFormat(format) {
      if (typeof format !== 'string') {
        return false
      }

      const hasElapsedTime = /\[[hms]+\]/i.test(format)
      const cleanFormat = format
        .replace(/"[^"]*"/g, '')
        .replace(/\\./g, '')
        .replace(/\[[^\]]+\]/g, '')

      return hasElapsedTime || /(h+|s+|AM\/PM|A\/P)/i.test(cleanFormat)
    },
    formatDateObject(date) {
      return this.formatDateParts({
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate(),
        H: date.getHours(),
        M: date.getMinutes(),
        S: date.getSeconds()
      })
    },
    formatDateParts(date, forceTime) {
      const dateText = [date.y, date.m, date.d].map(this.padDatePart).join('-')
      const hasTime = forceTime || date.H || date.M || date.S

      if (!hasTime) {
        return dateText
      }

      return `${dateText} ${[date.H, date.M, date.S].map(this.padDatePart).join(':')}`
    },
    padDatePart(value) {
      return String(value).padStart(2, '0')
    },
    getJsonHeaderMap(sheet) {
      const headers = {}
      const range = XLSX.utils.decode_range(sheet['!ref'])
      const R = range.s.r
      const jsonHeaders = []

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })]
        const value = cell == null ? '__EMPTY' : XLSX.utils.format_cell(cell)
        let header = value
        let counter = 0

        for (let CC = 0; CC < jsonHeaders.length; ++CC) {
          if (jsonHeaders[CC] === header) {
            header = value + '_' + (++counter)
          }
        }

        jsonHeaders[C] = header
        headers[header] = C
      }

      return headers
    },
    isDate1904(workbook) {
      return Boolean(workbook && workbook.Workbook && workbook.Workbook.WBProps && workbook.Workbook.WBProps.date1904)
    },
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
    },
    hasUtf8Bom(data) {
      const bytes = new Uint8Array(data)
      return bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
    },
    getHeaderRow(sheet) {
      const headers = []
      const range = XLSX.utils.decode_range(sheet['!ref'])
      let C
      const R = range.s.r
      /* start in the first row */
      for (C = range.s.c; C <= range.e.c; ++C) { /* walk every column in the range */
        const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })]
        /* find the cell in the first row */
        let hdr = 'UNKNOWN ' + C // <-- replace with your desired default
        if (cell && cell.t) hdr = XLSX.utils.format_cell(cell)
        headers.push(hdr)
      }
      return headers
    },
    isCsv(file) {
      return /\.csv$/i.test(file.name)
    },
    isExcel(file) {
      return /\.(xlsx|xls|csv)$/i.test(file.name)
    }
  }
}
</script>

<style scoped>
.excel-upload-input{
  display: none;
  z-index: -9999;
}
.drop{
  border: 2px dashed #bbb;
  width: 600px;
  height: 160px;
  line-height: 160px;
  margin: 0 auto;
  font-size: 24px;
  border-radius: 5px;
  text-align: center;
  color: #bbb;
  position: relative;
}
</style>
