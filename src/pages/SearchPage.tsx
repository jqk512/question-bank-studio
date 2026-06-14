import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookIcon, EditIcon, SearchIcon } from '../components/Icons'
import { HighlightedText } from '../components/HighlightedText'
import { useAuth } from '../auth/useAuth'
import { getBankBySlug, listQuestions } from '../lib/repository'
import { countQuestionTypes, filterQuestions, questionTypeLabels } from '../lib/question-search'
import type { Question, QuestionBank, QuestionType } from '../types'

export function SearchPage() {
  const auth = useAuth()
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const initialType = searchParams.get('type') as QuestionType | 'all' | null
  const [type, setType] = useState<QuestionType | 'all'>(initialType && ['all', 'single', 'multiple', 'judgment', 'unknown'].includes(initialType) ? initialType : 'all')

  useEffect(() => {
    getBankBySlug(slug).then(async (nextBank) => {
      setBank(nextBank ?? null)
      if (nextBank) setQuestions(await listQuestions(nextBank.id))
    }).catch(() => setBank(null)).finally(() => setLoading(false))
  }, [slug])

  const queryMatches = useMemo(() => filterQuestions(questions, query, 'all'), [query, questions])
  const visibleQuestions = useMemo(() => filterQuestions(queryMatches, '', type), [queryMatches, type])
  const counts = useMemo(() => countQuestionTypes(queryMatches), [queryMatches])

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

  if (loading) return <div className="public-loading">正在打开题库…</div>
  if (!bank || bank.status !== 'published') return <div className="public-loading"><BookIcon /><h1>题库不存在或已下线</h1><Link to="/">返回工作台</Link></div>

  return (
    <div className="public-page">
      <header className="public-hero">
        <div className="public-nav"><Link className="public-brand" to="/"><span>Q</span>题库工坊</Link>{(!auth.configured || auth.user?.id === bank.ownerId) && <Link className="button glass" to={`/review/${bank.id}`}><EditIcon />管理题库</Link>}</div>
        <div className="public-title"><p>QUESTION BANK · {bank.questionCount} ITEMS</p><h1>{bank.title}</h1><span>{bank.description || '输入关键词，检索题干、选项和答案内容。'}</span></div>
        <label className="hero-search"><SearchIcon /><input ref={searchInputRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词开始检索" /><kbd>⌘ K</kbd></label>
      </header>

      <main className="public-content">
        <section className="result-bar">
          <div><span>检索结果</span><strong>{query ? `找到 ${visibleQuestions.length} 道相关题目` : `共 ${visibleQuestions.length} 道题目`}</strong></div>
          <div className="public-filters">
            {(['all', 'single', 'multiple', 'judgment'] as const).map((filterType) => (
              <button className={type === filterType ? 'active' : ''} onClick={() => setType(filterType)} key={filterType}>
                {questionTypeLabels[filterType]} <b>{filterType === 'all' ? queryMatches.length : counts[filterType] ?? 0}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="public-results">
          {visibleQuestions.map((question) => (
            <article className="result-card" key={question.id}>
              <div className="result-number">{String(question.sequence).padStart(3, '0')}</div>
              <div className="result-question">
                <span className="result-type">{questionTypeLabels[question.type]}</span>
                <h2><HighlightedText text={question.stem} query={query} /></h2>
                <div className="result-options">
                  {question.options.map((option) => <div className={question.answer.includes(option.label) ? 'correct' : ''} key={option.label}><b>{option.label}</b><span><HighlightedText text={option.text} query={query} /></span></div>)}
                </div>
                <div className="result-answer"><strong>答案 {question.answer.join('、') || '待确认'}</strong>{question.explanation && <p>{question.explanation}</p>}</div>
              </div>
            </article>
          ))}
          {!visibleQuestions.length && <div className="public-empty"><SearchIcon /><h2>没有找到相关题目</h2><p>试试减少关键词，或切换题型。</p></div>}
        </section>
      </main>
    </div>
  )
}
