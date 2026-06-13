import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { countQuestionTypes, filterQuestions } from './question-search'

const questions: Question[] = [
  {
    id: 'q1', bankId: 'b1', sequence: 1, type: 'single', stem: '神经网络的基本单元是什么',
    options: [{ label: 'A', text: '神经元' }, { label: 'B', text: '数据库' }], answer: ['A'],
    answerText: ['神经元'], explanation: '', rawText: '', confidence: 1, warnings: [],
  },
  {
    id: 'q2', bankId: 'b2', sequence: 1, type: 'multiple', stem: '机器学习包含哪些方法',
    options: [{ label: 'A', text: '监督学习' }, { label: 'B', text: '强化学习' }], answer: ['A', 'B'],
    answerText: ['监督学习', '强化学习'], explanation: '两者都属于机器学习。', rawText: '', confidence: 1, warnings: [],
  },
]

describe('question search', () => {
  it('matches every entered term across question fields', () => {
    expect(filterQuestions(questions, '机器 强化', 'all').map((question) => question.id)).toEqual(['q2'])
  })

  it('combines keyword and type filters', () => {
    expect(filterQuestions(questions, '学习', 'single')).toEqual([])
    expect(filterQuestions(questions, '学习', 'multiple')).toHaveLength(1)
  })

  it('counts the filtered collection by type', () => {
    expect(countQuestionTypes(questions)).toEqual({ single: 1, multiple: 1 })
  })
})
