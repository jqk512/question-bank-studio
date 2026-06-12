import { describe, expect, it } from 'vitest'
import { parseQuestionText } from './question-parser'

describe('parseQuestionText', () => {
  it('parses single, multiple and judgment questions', () => {
    const result = parseQuestionText(`
1. 下列哪项是正确的？
A. 选项一
B. 选项二
答案：B

2、请选择所有正确项目。
A、甲
B、乙
C、丙
正确答案：AC

第3题 太阳从东方升起。
A. 正确
B. 错误
答案：A
`)

    expect(result.questions).toHaveLength(3)
    expect(result.questions[0].type).toBe('single')
    expect(result.questions[1].answer).toEqual(['A', 'C'])
    expect(result.questions[1].type).toBe('multiple')
    expect(result.questions[2].type).toBe('judgment')
    expect(result.questions.every((question) => question.warnings.length === 0)).toBe(true)
  })

  it('marks incomplete questions for review', () => {
    const result = parseQuestionText('1. 没有标准选项的题目\n答案：D')
    expect(result.questions[0].warnings).toContain('选项少于两个')
    expect(result.questions[0].warnings).toContain('答案缺少对应选项：D')
  })

  it('parses compact two-column option lines', () => {
    const result = parseQuestionText(`
1. 请选择正确答案。
A. 甲 B. 乙
C. 丙 D. 丁
答案：D
`)
    expect(result.questions[0].options.map((option) => option.label)).toEqual(['A', 'B', 'C', 'D'])
    expect(result.questions[0].answerText).toEqual(['丁'])
    expect(result.questions[0].warnings).toEqual([])
  })
})
