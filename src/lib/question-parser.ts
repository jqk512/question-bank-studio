import type {
  ParseResult,
  ParsedQuestion,
  QuestionOption,
  QuestionType,
} from '../types'

const QUESTION_START = /^\s*(?:第\s*)?(\d{1,5})\s*(?:题|[.．、:：)）])\s*/gm
const ANSWER_LINE = /^\s*(?:正确)?答案\s*(?:为)?\s*[:：]?\s*([^\n]+)$/gim
const EXPLANATION_LINE = /^\s*(?:答案)?解析\s*[:：]\s*([\s\S]*)$/im
const OPTION_START = /(?:^|\n|[ \t])([A-H])(?:[.．:：)）]\s+|、\s*)/gim

function normalizeSource(source: string) {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeAnswer(value: string) {
  const direct = value.toUpperCase().match(/[A-H]/g)
  if (direct?.length) return [...new Set(direct)]
  if (/正确|对|√/.test(value)) return ['A']
  if (/错误|错|×/.test(value)) return ['B']
  return []
}

function inferType(options: QuestionOption[], answer: string[]): QuestionType {
  const values = options.map((option) => option.text.replace(/[。.!！]/g, ''))
  const isJudgment =
    options.length === 2 &&
    values.some((value) => /^(正确|对|是)$/.test(value)) &&
    values.some((value) => /^(错误|错|否)$/.test(value))

  if (isJudgment) return 'judgment'
  if (answer.length > 1) return 'multiple'
  if (answer.length === 1) return 'single'
  return 'unknown'
}

function parseBlock(sequence: number, block: string): ParsedQuestion {
  const warnings: string[] = []
  const answerMatches = [...block.matchAll(ANSWER_LINE)]
  const answerMatch = answerMatches.at(-1)
  const answer = answerMatch ? normalizeAnswer(answerMatch[1]) : []

  if (!answer.length) warnings.push('未识别到答案')

  let content = answerMatch
    ? `${block.slice(0, answerMatch.index)}\n${block.slice((answerMatch.index ?? 0) + answerMatch[0].length)}`
    : block

  const explanationMatch = content.match(EXPLANATION_LINE)
  const explanation = explanationMatch ? cleanText(explanationMatch[1]) : ''
  if (explanationMatch?.index !== undefined) content = content.slice(0, explanationMatch.index)

  const optionMatches = [...content.matchAll(OPTION_START)]
  const options: QuestionOption[] = []

  for (const [index, match] of optionMatches.entries()) {
    const start = (match.index ?? 0) + match[0].length
    const end = optionMatches[index + 1]?.index ?? content.length
    options.push({ label: match[1].toUpperCase(), text: cleanText(content.slice(start, end)) })
  }

  const stemEnd = optionMatches[0]?.index ?? content.length
  const stem = cleanText(content.slice(0, stemEnd))

  if (!stem) warnings.push('题干为空')
  if (options.length < 2) warnings.push('选项少于两个')
  if (new Set(options.map((option) => option.label)).size !== options.length) {
    warnings.push('存在重复选项标签')
  }

  const optionMap = new Map(options.map((option) => [option.label, option.text]))
  const missingAnswers = answer.filter((label) => !optionMap.has(label))
  if (missingAnswers.length) warnings.push(`答案缺少对应选项：${missingAnswers.join('、')}`)

  const answerText = answer.map((label) => optionMap.get(label) ?? '')
  const confidence = Math.max(0.2, 1 - warnings.length * 0.2)

  return {
    sequence,
    type: inferType(options, answer),
    stem,
    options,
    answer,
    answerText,
    explanation,
    rawText: block.trim(),
    confidence,
    warnings,
  }
}

export function parseQuestionText(input: string): ParseResult {
  const sourceText = normalizeSource(input)
  const starts = [...sourceText.matchAll(QUESTION_START)]
  const warnings: string[] = []

  if (!starts.length) {
    return {
      questions: [],
      sourceText,
      warnings: ['没有识别到题号。请确认题目以“1.”、“1、”或“第1题”等格式开始。'],
    }
  }

  const questions = starts.map((start, index) => {
    const sequence = Number(start[1])
    const blockStart = (start.index ?? 0) + start[0].length
    const blockEnd = starts[index + 1]?.index ?? sourceText.length
    return parseBlock(sequence, sourceText.slice(blockStart, blockEnd))
  })

  const sequences = questions.map((question) => question.sequence)
  if (new Set(sequences).size !== sequences.length) warnings.push('存在重复题号')
  for (let index = 1; index < sequences.length; index += 1) {
    if (sequences[index] !== sequences[index - 1] + 1) {
      warnings.push('题号不连续，请检查是否漏题或拆分错误')
      break
    }
  }

  return { questions, sourceText, warnings }
}
