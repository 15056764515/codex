import { shallowMount } from '@vue/test-utils'
import UploadExcel from '@/components/UploadExcel/index.vue'

describe('UploadExcel.vue', () => {
  const mountUploadExcel = options => shallowMount(UploadExcel, {
    stubs: ['el-button'],
    ...options
  })

  it('accepts xlsx, xls, and csv file names', () => {
    const wrapper = mountUploadExcel()

    expect(wrapper.vm.isExcel({ name: 'demo.xlsx' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.xls' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.csv' })).toBe(true)
    expect(wrapper.vm.isExcel({ name: 'demo.txt' })).toBe(false)
  })
})
