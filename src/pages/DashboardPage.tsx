import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon, BookIcon, SearchIcon, TrashIcon, UploadIcon, WarningIcon } from '../components/Icons'
import { StatusBadge } from '../components/StatusBadge'
import { deleteBank, listBanks } from '../lib/repository'
import type { QuestionBank } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'

export function DashboardPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listBanks().then(setBanks).finally(() => setLoading(false))
  }, [])

  const visibleBanks = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('zh-CN')
    if (!term) return banks
    return banks.filter((bank) => `${bank.title} ${bank.description}`.toLocaleLowerCase('zh-CN').includes(term))
  }, [banks, query])

  const totals = useMemo(() => ({
    questions: banks.reduce((sum, bank) => sum + bank.questionCount, 0),
    warnings: banks.reduce((sum, bank) => sum + bank.warningCount, 0),
    published: banks.filter((bank) => bank.status === 'published').length,
  }), [banks])

  async function removeBank(bank: QuestionBank) {
    if (!window.confirm(`确认删除“${bank.title}”及其全部题目？`)) return
    await deleteBank(bank.id)
    setBanks((current) => current.filter((item) => item.id !== bank.id))
  }

  return (
    <>
      <section className="page-heading dashboard-heading">
        <div>
          <p className="kicker">LIBRARY OVERVIEW</p>
          <h1>你的题库工作台</h1>
          <p>导入原始文件，处理异常题目，然后发布为可检索的独立题库。</p>
        </div>
        <Link className="button primary" to="/import"><UploadIcon />导入新题库</Link>
      </section>

      <section className="stats-grid" aria-label="题库统计">
        <article><span>题库总数</span><strong>{banks.length}</strong><small>个{isSupabaseConfigured ? '云端' : '本地'}题库</small></article>
        <article><span>题目总数</span><strong>{totals.questions}</strong><small>道已识别题目</small></article>
        <article><span>待处理异常</span><strong>{totals.warnings}</strong><small>处需要人工确认</small></article>
        <article><span>已发布</span><strong>{totals.published}</strong><small>个可检索题库</small></article>
      </section>

      <section className="library-section">
        <div className="section-heading">
          <div><p className="kicker">QUESTION BANKS</p><h2>全部题库</h2></div>
          <label className="compact-search"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索题库" /></label>
        </div>

        {loading ? (
          <div className="empty-panel">正在读取{isSupabaseConfigured ? '云端' : '本地'}题库…</div>
        ) : visibleBanks.length === 0 ? (
          <div className="empty-panel large">
            <span className="empty-icon"><BookIcon /></span>
            <h2>{banks.length ? '没有匹配的题库' : '从第一份题库开始'}</h2>
            <p>{banks.length ? '换一个关键词试试。' : `支持 TXT、Markdown、DOCX 和文字型 PDF，${isSupabaseConfigured ? '解析后同步到你的私有云端空间。' : '文件只在当前浏览器中处理。'}`}</p>
            {!banks.length && <Link className="button primary" to="/import">选择题库文件<ArrowIcon /></Link>}
          </div>
        ) : (
          <div className="bank-grid">
            {visibleBanks.map((bank) => (
              <article className="bank-card" key={bank.id}>
                <div className="bank-card-top">
                  <StatusBadge status={bank.status} />
                  <button className="icon-button danger" onClick={() => removeBank(bank)} aria-label={`删除 ${bank.title}`}><TrashIcon /></button>
                </div>
                <div className="bank-monogram">{bank.title.slice(0, 1).toUpperCase()}</div>
                <h3>{bank.title}</h3>
                <p>{bank.description || `来源：${bank.sourceFileName}`}</p>
                <div className="bank-metrics">
                  <span><strong>{bank.questionCount}</strong> 题</span>
                  <span className={bank.warningCount ? 'metric-warning' : ''}>{bank.warningCount ? <WarningIcon /> : null}<strong>{bank.warningCount}</strong> 异常</span>
                </div>
                <div className="bank-actions">
                  <Link className="button subtle" to={`/review/${bank.id}`}>{bank.status === 'published' ? '管理' : '继续校对'}</Link>
                  {bank.status === 'published' && <Link className="button dark" to={`/bank/${bank.slug}`}>打开检索<ArrowIcon /></Link>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
