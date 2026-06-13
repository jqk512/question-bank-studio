import { useMemo, useState } from 'react'
import { SearchIcon } from './Icons'
import { countQuestionTypes, filterQuestions } from '../lib/question-search'
import type { Question, QuestionBank, QuestionType } from '../types'

const typeLabels: Record<QuestionType | 'all', string> = {
  all: '全部',
  single: '单选',
  multiple: '多选',
  judgment: '判断',
  unknown: '文本',
}

interface QuestionSearchResultsProps {
  questions: Question[]
  banks: QuestionBank[]
  placeholder?: string
}

export function QuestionSearchResults({ questions, banks, placeholder = '输入关键词检索题干、选项和答案' }: QuestionSearchResultsProps) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<QuestionType | 'all'>('all')
  const bankMap = useMemo(() => new Map(banks.map((bank) => [bank.id, bank])), [banks])
  const queryMatches = useMemo(() => filterQuestions(questions, query, 'all'), [query, questions])
  const visibleQuestions = useMemo(() => filterQuestions(queryMatches, '', type), [queryMatches, type])
  const counts = useMemo(() => countQuestionTypes(queryMatches), [queryMatches])
  const hasTextEntries = questions.some((question) => question.type === 'unknown')
  const allTextMode = banks.length > 0 && banks.every((bank) => bank.contentMode === 'text')
  const resultUnit = allTextMode ? '个文本片段' : hasTextEntries ? '条内容' : '道题目'

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
  }

  return (
    <>
      <label className="workspace-search"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label>
      <section className="workspace-result-bar">
        <div><span>检索结果</span><strong>{query ? `找到 ${visibleQuestions.length} ${resultUnit}` : `共 ${visibleQuestions.length} ${resultUnit}`}</strong></div>
        <div className="public-filters">
          {(['all', 'single', 'multiple', 'judgment', ...(hasTextEntries ? ['unknown' as const] : [])] as const).map((filterType) => (
            <button type="button" className={type === filterType ? 'active' : ''} onClick={() => setType(filterType)} key={filterType}>
              {typeLabels[filterType]} <b>{filterType === 'all' ? queryMatches.length : counts[filterType] ?? 0}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="workspace-results">
        {visibleQuestions.map((question) => {
          const bank = bankMap.get(question.bankId)
          return (
            <article className="result-card" key={question.id}>
              <div className="result-number">{String(question.sequence).padStart(3, '0')}</div>
              <div className="result-question">
                <div className="result-meta"><span className="result-type">{typeLabels[question.type]}</span>{banks.length > 1 && <span className="result-bank">{bank?.title ?? '未知题库'}</span>}{question.type === 'unknown' && <button className="copy-text-button" type="button" onClick={() => copyText(question.stem)}>复制文本</button>}</div>
                <h2 className={question.type === 'unknown' ? 'document-text' : ''}>{question.stem}</h2>
                {question.type !== 'unknown' && <>
                  <div className="result-options">
                    {question.options.map((option) => <div className={question.answer.includes(option.label) ? 'correct' : ''} key={option.label}><b>{option.label}</b><span>{option.text}</span></div>)}
                  </div>
                  <div className="result-answer"><strong>答案 {question.answer.join('、') || '待确认'}</strong>{question.explanation && <p>{question.explanation}</p>}</div>
                </>}
              </div>
            </article>
          )
        })}
        {!visibleQuestions.length && <div className="public-empty"><SearchIcon /><h2>没有找到相关题目</h2><p>试试减少关键词，或切换题型。</p></div>}
      </section>
    </>
  )
}
