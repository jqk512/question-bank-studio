import { describe, expect, it } from 'vitest'
import { sourceObjectPath } from './repository'

describe('sourceObjectPath', () => {
  it('keeps Unicode and punctuation out of Supabase object keys', () => {
    expect(sourceObjectPath('user-id', 'bank-id', 'SeaPerch China 2026夏季锦标赛 招募方案 2026.6.12.docx'))
      .toBe('user-id/bank-id/source.docx')
  })

  it('falls back to a safe extension', () => {
    expect(sourceObjectPath('user-id', 'bank-id', '没有扩展名'))
      .toBe('user-id/bank-id/source.bin')
  })
})
