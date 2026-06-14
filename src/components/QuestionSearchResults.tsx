import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchIcon } from './Icons'
import { HighlightedText } from './HighlightedText'
import { countQuestionTypes, filterQuestions, questionTypeLabels } from '../lib/question-search'
import type { Question, QuestionBank, QuestionType } from '../types'

interface QuestionSearchResultsProps {
  questions: Question[]
  banks: QuestionBank[]
  placeholder?: string
}

export function QuestionSearchResults({ questions, banks, placeholder = '输入关键词检索题干、选项和答案' }: QuestionSearchResultsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialType = searchParams.get('type') as QuestionType | 'all' | null
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [type, setType] = useState<QuestionType | 'all'>(initialType && ['all', 'single', 'multiple', 'judgment', 'unknown'].includes(initialType) ? initialType : 'all')
  const [displayLimit, setDisplayLimit] = useState(100)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const bankMap = useMemo(() => new Map(banks.map((bank) => [bank.id, bank])), [banks])
  const queryMatches = useMemo(() => filterQuestions(questions, query, 'all'), [query, questions])
  const visibleQuestions = useMemo(() => filterQuestions(queryMatches, '', type), [queryMatches, type])
  const counts = useMemo(() => countQuestionTypes(queryMatches), [queryMatches])
  const hasTextEntries = questions.some((question) => question.type === 'unknown')
  const allTextMode = banks.length > 0 && banks.every((bank) => bank.contentMode === 'text')
  const resultUnit = allTextMode ? '个文本片段' : hasTextEntries ? '条内容' : '道题目'

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (query) next.set('q', query); else next.delete('q')
    if (type !== 'all') next.set('type', type); else next.delete('type')
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [query, searchParams, setSearchParams, type])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!query || !visibleQuestions.length) return
    document.getElementById(`result-${visibleQuestions[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [query, visibleQuestions])

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
  }

  return (
    <>
      <label className="workspace-search"><SearchIcon /><input ref={searchInputRef} value={query} onChange={(event) => { setQuery(event.target.value); setDisplayLimit(100) }} placeholder={placeholder} /><kbd>⌘ K</kbd></label>
      <section className="workspace-result-bar">
        <div><span>检索结果</span><strong>{query ? `找到 ${visibleQuestions.length} ${resultUnit}` : `共 ${visibleQuestions.length} ${resultUnit}`}</strong></div>
        <div className="public-filters">
          {(['all', 'single', 'multiple', 'judgment', ...(hasTextEntries ? ['unknown' as const] : [])] as const).map((filterType) => (
            <button type="button" className={type === filterType ? 'active' : ''} onClick={() => { setType(filterType); setDisplayLimit(100) }} key={filterType}>
              {questionTypeLabels[filterType]} <b>{filterType === 'all' ? queryMatches.length : counts[filterType] ?? 0}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="workspace-results">
        {visibleQuestions.slice(0, displayLimit).map((question) => {
          const bank = bankMap.get(question.bankId)
          return (
            <article className="result-card" id={`result-${question.id}`} key={question.id}>
              <div className="result-number">{String(question.sequence).padStart(3, '0')}</div>
              <div className="result-question">
                <div className="result-meta"><span className="result-type">{questionTypeLabels[question.type]}</span>{banks.length > 1 && <span className="result-bank">{bank?.title ?? '未知题库'}</span>}{question.type === 'unknown' && <button className="copy-text-button" type="button" onClick={() => copyText(question.stem)}>复制文本</button>}</div>
                <h2 className={question.type === 'unknown' ? 'document-text' : ''}><HighlightedText text={question.stem} query={query} /></h2>
                {question.type !== 'unknown' && <>
                  <div className="result-options">
                    {question.options.map((option) => <div className={question.answer.includes(option.label) ? 'correct' : ''} key={option.label}><b>{option.label}</b><span><HighlightedText text={option.text} query={query} /></span></div>)}
                  </div>
                  <div className="result-answer"><strong>答案 {question.answer.join('、') || '待确认'}</strong>{question.explanation && <p>{question.explanation}</p>}</div>
                </>}
              </div>
            </article>
          )
        })}
        {visibleQuestions.length > displayLimit && <button className="button subtle load-more" type="button" onClick={() => setDisplayLimit((value) => value + 100)}>继续显示（剩余 {visibleQuestions.length - displayLimit} 条）</button>}
        {!visibleQuestions.length && <div className="public-empty"><SearchIcon /><h2>没有找到相关题目</h2><p>试试减少关键词，或切换题型。</p></div>}
      </section>
    </>
  )
}
