import { shallowMount } from '@vue/test-utils'
import UploadExcel from '@/components/UploadExcel/index.vue'
import XLSX from 'xlsx'

describe('UploadExcel date parsing', () => {
  const mountUploadExcel = options => shallowMount(UploadExcel, {
    stubs: ['el-button'],
    ...options
  })

  it('normalizes csv date strings without changing ordinary numbers', () => {
    const wrapper = mountUploadExcel()
    const csv = 'date,dateTime,cnDate,code\n2024-01-02,2024/03/04 05:06:07,2024\u5e745\u67086\u65e5,1322533\n'
    const workbook = XLSX.read(csv, { type: 'string' })
    const rawWorkbook = XLSX.read(csv, { type: 'string', raw: true })

    expect(wrapper.vm.normalizeSheetData(workbook.Sheets.Sheet1, rawWorkbook.Sheets.Sheet1)).toEqual([
      {
        date: '2024-01-02',
        dateTime: '2024-03-04 05:06:07',
        cnDate: '2024-05-06',
        code: 1322533
      }
    ])
  })

  it('normalizes xlsx date cells and string dates', () => {
    const wrapper = mountUploadExcel()
    const worksheet = {
      '!ref': 'A1:C3',
      A1: { t: 's', v: 'date' },
      B1: { t: 's', v: 'dateTime' },
      C1: { t: 's', v: 'count' },
      A2: { t: 'n', v: 45293, z: 'm/d/yy' },
      B2: { t: 'n', v: 45293.52425925926, z: 'm/d/yy h:mm:ss' },
      C2: { t: 'n', v: 99, z: 'General' },
      A3: { t: 's', v: '2024/03/04' },
      B3: { t: 's', v: '2024-03-04 05:06' },
      C3: { t: 'n', v: 100, z: 'General' }
    }

    expect(wrapper.vm.normalizeSheetData(worksheet)).toEqual([
      {
        date: '2024-01-02',
        dateTime: '2024-01-02 12:34:56',
        count: 99
      },
      {
        date: '2024-03-04',
        dateTime: '2024-03-04 05:06:00',
        count: 100
      }
    ])
  })
})
