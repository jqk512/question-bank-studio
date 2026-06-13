import { describe, expect, it } from 'vitest'
import { assessPdfTextExtraction } from './file-extractor'

describe('assessPdfTextExtraction', () => {
  it('accepts normal text PDFs even when they contain a blank cover page', () => {
    const result = assessPdfTextExtraction([
      '',
      '1. 人工智能的研究内容包括什么？ A. 机器学习 B. 数据库 答案：A',
      '2. 神经网络的基本组成是什么？ A. 神经元 B. 路由器 答案：A',
    ])

    expect(result.likelyScanned).toBe(false)
    expect(result.textPageCount).toBe(2)
  })

  it('detects image-only scanned PDFs', () => {
    const result = assessPdfTextExtraction(['', ' ', '\n'])

    expect(result).toMatchObject({
      pageCount: 3,
      textPageCount: 0,
      characterCount: 0,
      likelyScanned: true,
    })
  })

  it('detects PDFs with only sparse OCR noise', () => {
    const result = assessPdfTextExtraction(['页', '', '1', '', '题'])

    expect(result.likelyScanned).toBe(true)
  })
})
