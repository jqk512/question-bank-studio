import type { Question, QuestionType } from '../types'
import { validateQuestion } from '../lib/question-validation'
import { WarningIcon } from './Icons'

const typeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  judgment: '判断题',
  unknown: '待确认',
}

interface QuestionEditorProps {
  question: Question
  onChange: (question: Question) => void
}

export function QuestionEditor({ question, onChange }: QuestionEditorProps) {
  function updateQuestion(nextQuestion: Question) {
    onChange(validateQuestion(nextQuestion))
  }

  function updateOption(index: number, value: string) {
    const options = question.options.map((option, optionIndex) =>
      optionIndex === index ? { ...option, text: value } : option,
    )
    updateQuestion({ ...question, options })
  }

  function updateAnswer(value: string) {
    const answer = [...new Set(value.toUpperCase().match(/[A-H]/g) ?? [])]
    const optionMap = new Map(question.options.map((option) => [option.label, option.text]))
    updateQuestion({
      ...question,
      answer,
      answerText: answer.map((label) => optionMap.get(label) ?? ''),
    })
  }

  return (
    <article className={`editor-card ${question.warnings.length ? 'has-warning' : ''}`}>
      <div className="editor-heading">
        <span className="question-number">{String(question.sequence).padStart(3, '0')}</span>
        <select
          aria-label={`第 ${question.sequence} 题题型`}
          value={question.type}
          onChange={(event) => updateQuestion({ ...question, type: event.target.value as QuestionType })}
        >
          {Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <span className="confidence">置信度 {Math.round(question.confidence * 100)}%</span>
      </div>

      {question.warnings.length > 0 && (
        <div className="warning-strip"><WarningIcon />{question.warnings.join('；')}</div>
      )}

      <label className="field-label">题干
        <textarea value={question.stem} onChange={(event) => updateQuestion({ ...question, stem: event.target.value })} />
      </label>

      <div className="option-editor">
        <span className="field-caption">选项</span>
        {question.options.map((option, index) => (
          <label key={`${option.label}-${index}`}>
            <b>{option.label}</b>
            <input value={option.text} onChange={(event) => updateOption(index, event.target.value)} />
          </label>
        ))}
      </div>

      <div className="editor-grid">
        <label className="field-label">答案
          <input value={question.answer.join('、')} onChange={(event) => updateAnswer(event.target.value)} placeholder="例如 A 或 A、C" />
        </label>
        <label className="field-label">解析（可选）
          <input value={question.explanation} onChange={(event) => updateQuestion({ ...question, explanation: event.target.value })} />
        </label>
      </div>
    </article>
  )
}
