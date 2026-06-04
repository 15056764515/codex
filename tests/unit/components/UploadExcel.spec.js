import { shallowMount } from '@vue/test-utils'
import UploadExcel from '@/components/UploadExcel/index.vue'
import { TextDecoder } from 'util'

const deviceHeader = '\u8bbe\u5907\u53f7'
const gb18030CsvBytes = Uint8Array.from([
  0xC9, 0xE8, 0xB1, 0xB8, 0xBA, 0xC5, 0x2C, 0x53, 0x4E, 0x0D, 0x0A,
  0x31, 0x33, 0x32, 0x32, 0x35, 0x33, 0x33, 0x2C, 0x31, 0x31, 0x31, 0x31,
  0x0D, 0x0A
])

describe('UploadExcel.vue', () => {
  const mountUploadExcel = options => shallowMount(UploadExcel, {
    stubs: ['el-button'],
    ...options
  })

  beforeAll(() => {
    global.TextDecoder = TextDecoder
  })

  it('decodes gb18030 csv data without Chinese mojibake', () => {
    const wrapper = mountUploadExcel()

    expect(wrapper.vm.decodeCsvData(gb18030CsvBytes.buffer)).toBe(`${deviceHeader},SN\r\n1322533,1111\r\n`)
  })

  it('reads gb18030 csv and returns readable table data', async() => {
    const nativeFileReader = window.FileReader
    const onSuccess = jest.fn()
    const wrapper = mountUploadExcel({
      propsData: { onSuccess }
    })

    try {
      window.FileReader = jest.fn(function() {
        this.readAsArrayBuffer = jest.fn(() => {
          this.onload({
            target: {
              result: gb18030CsvBytes.buffer
            }
          })
        })
      })

      await wrapper.vm.readerData({ name: 'test.csv' })

      expect(onSuccess).toHaveBeenCalledWith({
        header: [deviceHeader, 'SN'],
        results: [
          {
            [deviceHeader]: 1322533,
            SN: 1111
          }
        ]
      })
    } finally {
      window.FileReader = nativeFileReader
    }
  })

  it('accepts xlsx, xls, and csv file names', () => {
    const wrapper = mountUploadExcel()

    expect(wrapper.vm.isExcel({ name: 'demo.xlsx' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.xls' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.csv' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.txt' })).toBe(false)
  })
})
