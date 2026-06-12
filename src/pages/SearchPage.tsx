import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookIcon, EditIcon, SearchIcon } from '../components/Icons'
import { useAuth } from '../auth/useAuth'
import { getBankBySlug, listQuestions } from '../lib/repository'
import type { Question, QuestionBank, QuestionType } from '../types'

const typeLabels: Record<QuestionType | 'all', string> = {
  all: '全部',
  single: '单选',
  multiple: '多选',
  judgment: '判断',
  unknown: '其他',
}

function searchableText(question: Question) {
  return [question.stem, question.options.map((option) => option.text).join(' '), question.answer.join(' '), question.answerText.join(' '), question.explanation].join(' ').toLocaleLowerCase('zh-CN')
}

export function SearchPage() {
  const auth = useAuth()
  const { slug = '' } = useParams()
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<QuestionType | 'all'>('all')

  useEffect(() => {
    getBankBySlug(slug).then(async (nextBank) => {
      setBank(nextBank ?? null)
      if (nextBank) setQuestions(await listQuestions(nextBank.id))
    }).catch(() => setBank(null)).finally(() => setLoading(false))
  }, [slug])

  const queryMatches = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean)
    if (!terms.length) return questions
    return questions.filter((question) => {
      const source = searchableText(question)
      return terms.every((term) => source.includes(term))
    })
  }, [query, questions])

  const visibleQuestions = type === 'all' ? queryMatches : queryMatches.filter((question) => question.type === type)
  const counts = queryMatches.reduce<Record<string, number>>((result, question) => {
    result[question.type] = (result[question.type] ?? 0) + 1
    return result
  }, {})

  if (loading) return <div className="public-loading">正在打开题库…</div>
  if (!bank || bank.status !== 'published') return <div className="public-loading"><BookIcon /><h1>题库不存在或已下线</h1><Link to="/">返回工作台</Link></div>

  return (
    <div className="public-page">
      <header className="public-hero">
        <div className="public-nav"><Link className="public-brand" to="/"><span>Q</span>题库工坊</Link>{(!auth.configured || auth.user?.id === bank.ownerId) && <Link className="button glass" to={`/review/${bank.id}`}><EditIcon />管理题库</Link>}</div>
        <div className="public-title"><p>QUESTION BANK · {bank.questionCount} ITEMS</p><h1>{bank.title}</h1><span>{bank.description || '输入关键词，检索题干、选项和答案内容。'}</span></div>
        <label className="hero-search"><SearchIcon /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词开始检索" /><kbd>⌘ K</kbd></label>
      </header>

      <main className="public-content">
        <section className="result-bar">
          <div><span>检索结果</span><strong>{query ? `找到 ${visibleQuestions.length} 道相关题目` : `共 ${visibleQuestions.length} 道题目`}</strong></div>
          <div className="public-filters">
            {(['all', 'single', 'multiple', 'judgment'] as const).map((filterType) => (
              <button className={type === filterType ? 'active' : ''} onClick={() => setType(filterType)} key={filterType}>
                {typeLabels[filterType]} <b>{filterType === 'all' ? queryMatches.length : counts[filterType] ?? 0}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="public-results">
          {visibleQuestions.map((question) => (
            <article className="result-card" key={question.id}>
              <div className="result-number">{String(question.sequence).padStart(3, '0')}</div>
              <div className="result-question">
                <span className="result-type">{typeLabels[question.type]}</span>
                <h2>{question.stem}</h2>
                <div className="result-options">
                  {question.options.map((option) => <div className={question.answer.includes(option.label) ? 'correct' : ''} key={option.label}><b>{option.label}</b><span>{option.text}</span></div>)}
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
