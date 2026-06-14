import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { validateQuestion } from './question-validation'

const baseQuestion: Question = {
  id: 'question-1',
  bankId: 'bank-1',
  sequence: 1,
  displayNumber: 1,
  type: 'single',
  stem: '示例题目',
  options: [{ label: 'A', text: '甲' }, { label: 'B', text: '乙' }],
  answer: ['A'],
  answerText: [],
  explanation: '',
  rawText: '',
  confidence: 0.2,
  warnings: ['未识别到答案'],
}

describe('validateQuestion', () => {
  it('clears stale warnings after a question is corrected', () => {
    const result = validateQuestion(baseQuestion)
    expect(result.warnings).toEqual([])
    expect(result.answerText).toEqual(['甲'])
    expect(result.confidence).toBe(1)
  })

  it('rebuilds warnings when an answer has no matching option', () => {
    const result = validateQuestion({ ...baseQuestion, answer: ['D'] })
    expect(result.warnings).toEqual(['答案缺少对应选项：D'])
    expect(result.answerText).toEqual([''])
  })

  it('infers a type after a previously unknown question receives an answer', () => {
    const result = validateQuestion({ ...baseQuestion, type: 'unknown', answer: ['A'] })
    expect(result.type).toBe('single')
  })
})
