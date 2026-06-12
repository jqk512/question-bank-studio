import type { Question } from '../types'

function inferQuestionType(question: Question): Question['type'] {
  const optionValues = question.options.map((option) => option.text.trim().replace(/[。.!！]/g, ''))
  const isJudgment = question.options.length === 2
    && optionValues.some((value) => /^(正确|对|是)$/.test(value))
    && optionValues.some((value) => /^(错误|错|否)$/.test(value))

  if (isJudgment) return 'judgment'
  if (question.answer.length > 1) return 'multiple'
  if (question.answer.length === 1) return 'single'
  return 'unknown'
}

export function validateQuestion(question: Question): Question {
  const warnings: string[] = []
  const stem = question.stem.trim()
  const optionLabels = question.options.map((option) => option.label)
  const optionMap = new Map(question.options.map((option) => [option.label, option.text]))

  if (!stem) warnings.push('题干为空')
  if (question.options.length < 2) warnings.push('选项少于两个')
  if (new Set(optionLabels).size !== optionLabels.length) warnings.push('存在重复选项标签')
  if (!question.answer.length) warnings.push('未识别到答案')

  const missingAnswers = question.answer.filter((label) => !optionMap.has(label))
  if (missingAnswers.length) warnings.push(`答案缺少对应选项：${missingAnswers.join('、')}`)

  return {
    ...question,
    type: question.type === 'unknown' ? inferQuestionType(question) : question.type,
    answerText: question.answer.map((label) => optionMap.get(label) ?? ''),
    confidence: Math.max(0.2, 1 - warnings.length * 0.2),
    warnings,
  }
}
