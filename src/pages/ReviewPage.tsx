import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowIcon, CheckIcon, CopyIcon, SearchIcon, WarningIcon } from '../components/Icons'
import { QuestionEditor } from '../components/QuestionEditor'
import { validateQuestion } from '../lib/question-validation'
import { getBank, listQuestions, replaceQuestions, saveBank } from '../lib/repository'
import type { Question, QuestionBank } from '../types'

export function ReviewPage() {
  const { bankId = '' } = useParams()
  const navigate = useNavigate()
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState<'all' | 'warnings'>('all')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getBank(bankId), listQuestions(bankId)]).then(([nextBank, nextQuestions]) => {
      setBank(nextBank ?? null)
      setQuestions(nextQuestions)
    })
  }, [bankId])

  const visibleQuestions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('zh-CN')
    return questions.filter((question) => {
      if (filter === 'warnings' && !question.warnings.length) return false
      if (!term) return true
      return `${question.stem} ${question.options.map((option) => option.text).join(' ')}`.toLocaleLowerCase('zh-CN').includes(term)
    })
  }, [filter, query, questions])

  const warningCount = questions.filter((question) => question.warnings.length).length

  function updateQuestion(nextQuestion: Question) {
    setSaved(false)
    setError('')
    setQuestions((current) => current.map((question) => question.id === nextQuestion.id ? nextQuestion : question))
  }

  async function persist(nextStatus?: QuestionBank['status']) {
    if (!bank) return
    const normalizedTitle = bank.title.trim()
    if (!normalizedTitle) {
      setError('题库名称不能为空。')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const validatedQuestions = questions.map(validateQuestion)
    const nextWarningCount = validatedQuestions.filter((question) => question.warnings.length).length
    const publishing = nextStatus === 'published'
    const unpublishing = nextStatus === 'review' && bank.status === 'published'
    const nextBank: QuestionBank = {
      ...bank,
      title: normalizedTitle,
      description: bank.description.trim(),
      status: nextStatus ?? bank.status,
      visibility: publishing ? 'public' : unpublishing ? 'private' : bank.visibility,
      warningCount: nextWarningCount,
      questionCount: validatedQuestions.length,
      updatedAt: now,
      publishedAt: publishing ? bank.publishedAt ?? now : unpublishing ? undefined : bank.publishedAt,
    }
    try {
      await replaceQuestions(bank.id, validatedQuestions)
      const savedBank = await saveBank(nextBank)
      setQuestions(validatedQuestions)
      setBank(savedBank)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
      return savedBank
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请稍后重试。')
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    const savedBank = await persist('published')
    if (savedBank) navigate(`/bank/${savedBank.slug}`)
  }

  async function unpublish() {
    await persist('review')
  }

  async function copyLink() {
    if (!bank) return
    const url = `${window.location.href.split('#')[0]}#/bank/${bank.slug}`
    await navigator.clipboard.writeText(url)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function updateMetadata(changes: Partial<Pick<QuestionBank, 'title' | 'description'>>) {
    setBank((current) => current ? { ...current, ...changes } : current)
    setSaved(false)
    setError('')
  }

  if (!bank) return <div className="empty-panel">正在读取题库…</div>

  return (
    <>
      <section className="review-header">
        <div>
          <Link className="back-link" to="/">← 返回题库管理</Link>
          <p className="kicker">REVIEW WORKSPACE</p>
          <h1>{bank.title}</h1>
          <p>{bank.sourceFileName} · {questions.length} 道题 · {warningCount} 处待确认</p>
        </div>
        <div className="review-actions">
          {bank.status === 'published' && <button className="button subtle" onClick={copyLink}><CopyIcon />复制链接</button>}
          {bank.status === 'published' && <button className="button subtle" onClick={unpublish} disabled={saving}>下线题库</button>}
          <button className="button subtle" onClick={() => persist()} disabled={saving}>{saved ? <><CheckIcon />已保存</> : saving ? '保存中…' : '保存修改'}</button>
          <button className="button primary" onClick={publish} disabled={saving || !questions.length}>{bank.status === 'published' ? '查看检索页' : '发布题库'}<ArrowIcon /></button>
        </div>
      </section>

      <section className="publication-panel panel">
        <div className="publication-summary">
          <div><p className="kicker">PUBLISHING</p><h2>发布信息</h2></div>
          <span className={`publication-state ${bank.status === 'published' ? 'online' : ''}`}>{bank.status === 'published' ? '公开检索中' : '仅自己可见'}</span>
        </div>
        <div className="publication-fields">
          <label className="field-label">题库名称<input maxLength={120} value={bank.title} onChange={(event) => updateMetadata({ title: event.target.value })} /></label>
          <label className="field-label">题库简介<textarea value={bank.description} onChange={(event) => updateMetadata({ description: event.target.value })} placeholder="说明课程、章节或这份题库的用途" /></label>
        </div>
        <div className="publication-link"><span>公开链接标识</span><code>{bank.slug}</code><small>发生重名时系统会自动添加唯一后缀。</small></div>
      </section>

      {error && <div className="error-message review-error"><WarningIcon />{error}</div>}

      <section className="review-toolbar panel">
        <div className="segmented-control">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部 {questions.length}</button>
          <button className={filter === 'warnings' ? 'active warning' : ''} onClick={() => setFilter('warnings')}><WarningIcon />待检查 {warningCount}</button>
        </div>
        <label className="compact-search"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前题库" /></label>
      </section>

      {warningCount > 0 && (
        <div className="review-notice"><WarningIcon /><div><strong>自动解析并不保证完全准确</strong><p>异常提示用于定位高风险题目。修改后保存即可，发布不会被强制阻止。</p></div></div>
      )}

      <section className="editor-list">
        {visibleQuestions.map((question) => <QuestionEditor key={question.id} question={question} onChange={updateQuestion} />)}
        {!visibleQuestions.length && <div className="empty-panel">当前筛选条件下没有题目。</div>}
      </section>
    </>
  )
}
