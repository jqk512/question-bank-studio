import type { Question, QuestionType } from '../types'

export const questionTypeLabels: Record<QuestionType | 'all', string> = {
  all: '全部',
  single: '单选',
  multiple: '多选',
  judgment: '判断',
  unknown: '文本',
}

export function searchTerms(query: string) {
  return query.trim().split(/\s+/).filter(Boolean)
}

export function searchableQuestionText(question: Question) {
  return [
    question.stem,
    question.options.map((option) => option.text).join(' '),
    question.answer.join(' '),
    question.answerText.join(' '),
    question.explanation,
  ].join(' ').toLocaleLowerCase('zh-CN')
}

export function filterQuestions(questions: Question[], query: string, type: QuestionType | 'all') {
  const terms = searchTerms(query).map((term) => term.toLocaleLowerCase('zh-CN'))
  return questions.filter((question) => {
    if (type !== 'all' && question.type !== type) return false
    if (!terms.length) return true
    const source = searchableQuestionText(question)
    return terms.every((term) => source.includes(term))
  })
}

export function countQuestionTypes(questions: Question[]) {
  return questions.reduce<Partial<Record<QuestionType, number>>>((counts, question) => {
    counts[question.type] = (counts[question.type] ?? 0) + 1
    return counts
  }, {})
}
