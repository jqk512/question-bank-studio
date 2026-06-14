import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookIcon, FolderIcon, PlusIcon, SettingsIcon, TrashIcon, UploadIcon, WarningIcon } from '../components/Icons'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { QuestionSearchResults } from '../components/QuestionSearchResults'
import {
  deleteBank,
  deleteGroup,
  listBanks,
  listGroupMemberships,
  listGroups,
  listQuestionsForBanks,
  saveGroup,
  setGroupBanks,
} from '../lib/repository'
import { uniqueId } from '../lib/slug'
import type { BankGroup, BankGroupMembership, Question, QuestionBank } from '../types'

export function LibraryPage() {
  const { bankId, groupId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const searchingAll = location.pathname === '/library/all'
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [groups, setGroups] = useState<BankGroup[]>([])
  const [memberships, setMemberships] = useState<BankGroupMembership[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedQuestionKey, setLoadedQuestionKey] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [managingGroup, setManagingGroup] = useState(false)
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<{ kind: 'bank' | 'group'; id: string; title: string } | null>(null)

  async function refreshLibrary() {
    const [nextBanks, nextGroups, nextMemberships] = await Promise.all([listBanks(), listGroups(), listGroupMemberships()])
    setBanks(nextBanks)
    setGroups(nextGroups)
    setMemberships(nextMemberships)
  }

  useEffect(() => {
    Promise.all([listBanks(), listGroups(), listGroupMemberships()]).then(([nextBanks, nextGroups, nextMemberships]) => {
      setBanks(nextBanks)
      setGroups(nextGroups)
      setMemberships(nextMemberships)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '读取题库失败。')).finally(() => setLoading(false))
  }, [])

  const activeGroup = groups.find((group) => group.id === groupId)
  const activeBank = banks.find((bank) => bank.id === bankId)
  const activeBankIds = useMemo(() => {
    if (searchingAll) return banks.map((bank) => bank.id)
    if (activeBank) return [activeBank.id]
    if (activeGroup) return memberships.filter((membership) => membership.groupId === activeGroup.id).map((membership) => membership.bankId)
    return []
  }, [activeBank, activeGroup, banks, memberships, searchingAll])
  const activeBanks = banks.filter((bank) => activeBankIds.includes(bank.id))
  const activeQuestionKey = activeBankIds.join('|')
  const loadingQuestions = Boolean(activeQuestionKey && loadedQuestionKey !== activeQuestionKey)
  const activeBankContentMissing = Boolean(activeBank && !loadingQuestions && activeBank.questionCount > 0 && questions.length === 0)

  useEffect(() => {
    if (!activeQuestionKey) return
    let current = true
    listQuestionsForBanks(activeQuestionKey.split('|')).then((nextQuestions) => {
      if (!current) return
      setQuestions(nextQuestions)
      setLoadedQuestionKey(activeQuestionKey)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '读取题目失败。'))
    return () => { current = false }
  }, [activeQuestionKey])

  const groupedBankIds = new Set(memberships.map((membership) => membership.bankId))
  const ungroupedBanks = banks.filter((bank) => !groupedBankIds.has(bank.id))

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return
    const now = new Date().toISOString()
    const group = await saveGroup({ id: uniqueId('group'), name, createdAt: now, updatedAt: now })
    setGroups((current) => [group, ...current])
    setNewGroupName('')
    setCreatingGroup(false)
    navigate(`/library/group/${group.id}`)
  }

  async function saveMembers() {
    if (!activeGroup) return
    await setGroupBanks(activeGroup.id, selectedBankIds)
    await refreshLibrary()
    setManagingGroup(false)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    if (confirmTarget.kind === 'group') await deleteGroup(confirmTarget.id)
    else await deleteBank(confirmTarget.id)
    await refreshLibrary()
    if (confirmTarget.id === bankId || confirmTarget.id === groupId) navigate('/')
    setConfirmTarget(null)
  }

  function exportBank(bank: QuestionBank, format: 'json' | 'txt') {
    const bankQuestions = questions.filter((question) => question.bankId === bank.id)
    const content = format === 'json'
      ? JSON.stringify({ bank, questions: bankQuestions }, null, 2)
      : bankQuestions.map((question) => question.type === 'unknown'
        ? question.stem
        : `${question.sequence}. ${question.stem}\n${question.options.map((option) => `${option.label}. ${option.text}`).join('\n')}\n答案：${question.answer.join('') || '待确认'}${question.explanation ? `\n解析：${question.explanation}` : ''}`).join('\n\n')
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${bank.title}.${format}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function toggleBank(bankIdToToggle: string) {
    setSelectedBankIds((current) => current.includes(bankIdToToggle)
      ? current.filter((id) => id !== bankIdToToggle)
      : [...current, bankIdToToggle])
  }

  function toggleGroupManager() {
    if (!managingGroup) setSelectedBankIds(activeBankIds)
    setManagingGroup((value) => !value)
  }

  function bankCountLabel(bank: QuestionBank) {
    return `${bank.questionCount} ${bank.contentMode === 'text' ? '个片段' : '道题'}`
  }

  if (loading) return <div className="empty-panel">正在读取题库工作区…</div>

  return (
    <div className="library-workspace">
      <aside className="library-rail panel">
        <div className="library-rail-heading"><div><p className="kicker">YOUR LIBRARY</p><h1>题库列表</h1></div><Link className="rail-icon-button" to="/import" aria-label="导入新题库"><UploadIcon /></Link></div>
        <button className="new-group-button" type="button" onClick={() => setCreatingGroup((value) => !value)}><PlusIcon />新建分组</button>
        {creatingGroup && <div className="new-group-form"><input autoFocus value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createGroup() }} placeholder="例如：期末复习" /><button onClick={createGroup}>创建</button></div>}

        <div className="library-list">
          {banks.length > 0 && <NavLink className="global-search-link" to="/library/all"><BookIcon /><span>搜索全部题库</span><b>{banks.length}</b></NavLink>}
          {groups.map((group) => {
            const groupBankIds = memberships.filter((membership) => membership.groupId === group.id).map((membership) => membership.bankId)
            const groupBanks = banks.filter((bank) => groupBankIds.includes(bank.id))
            return <div className="library-group" key={group.id}>
              <NavLink className="group-link" to={`/library/group/${group.id}`} onClick={() => setManagingGroup(false)}><FolderIcon /><span>{group.name}</span><b>{groupBanks.length}</b></NavLink>
              <div className="group-bank-list">{groupBanks.map((bank) => <NavLink to={`/library/bank/${bank.id}`} onClick={() => setManagingGroup(false)} key={bank.id}><span>{bank.title.slice(0, 1)}</span><div><strong>{bank.title}</strong><small>{bankCountLabel(bank)}</small></div></NavLink>)}</div>
            </div>
          })}
          {ungroupedBanks.length > 0 && <div className="library-group"><div className="group-label"><BookIcon />未编组 <b>{ungroupedBanks.length}</b></div><div className="group-bank-list">{ungroupedBanks.map((bank) => <NavLink to={`/library/bank/${bank.id}`} onClick={() => setManagingGroup(false)} key={bank.id}><span>{bank.title.slice(0, 1)}</span><div><strong>{bank.title}</strong><small>{bankCountLabel(bank)}</small></div></NavLink>)}</div></div>}
        </div>
      </aside>

      <main className="library-main">
        {(location.state as { notice?: string } | null)?.notice && <div className="warning-strip library-error"><WarningIcon />{(location.state as { notice: string }).notice}</div>}
        {error && <div className="error-message library-error"><WarningIcon />{error}</div>}
        {!activeBank && !activeGroup && !searchingAll ? (
          <section className="library-welcome panel"><span className="empty-icon"><BookIcon /></span><p className="kicker">SEARCH WORKSPACE</p><h2>{banks.length ? '选择一个题库或分组开始检索' : '导入第一份题库'}</h2><p>{banks.length ? '左侧每份题库都是独立子列表；选择分组后可同时检索组内全部题目。' : '上传文件后会自动建立独立题库子列表。'}</p><Link className="button primary" to="/import"><UploadIcon />导入新题库</Link></section>
        ) : (
          <>
            <header className="library-target-header">
              <div><p className="kicker">{searchingAll ? 'GLOBAL SEARCH' : activeGroup ? 'GROUP SEARCH' : activeBank?.contentMode === 'text' ? 'TEXT LIBRARY' : 'QUESTION BANK'}</p><h1>{searchingAll ? '搜索全部题库' : activeGroup?.name ?? activeBank?.title}</h1><p>{searchingAll ? `${activeBanks.length} 份资料 · ${activeBanks.reduce((sum, bank) => sum + bank.questionCount, 0)} 条内容` : activeGroup ? `${activeBanks.length} 份资料 · ${activeBanks.reduce((sum, bank) => sum + bank.questionCount, 0)} 条内容` : `${activeBank?.sourceFileName} · ${activeBank ? bankCountLabel(activeBank) : ''}`}</p></div>
              <div className="library-target-actions">
                {activeBank && <Link className="button subtle" to={`/import?replace=${activeBank.id}`}>重新导入</Link>}
                {activeBank && <button className="button subtle" type="button" onClick={() => exportBank(activeBank, activeBank.contentMode === 'text' ? 'txt' : 'json')}>导出</button>}
                {activeBank && <button className="icon-button danger" onClick={() => setConfirmTarget({ kind: 'bank', id: activeBank.id, title: activeBank.title })} aria-label={`删除 ${activeBank.title}`}><TrashIcon /></button>}
                {activeBank?.contentMode === 'questions' && <Link className="button subtle" to={`/review/${activeBank.id}`}>校对与发布</Link>}
                {activeGroup && <button className="button subtle" onClick={toggleGroupManager}><SettingsIcon />管理成员</button>}
                {activeGroup && <button className="icon-button danger" onClick={() => setConfirmTarget({ kind: 'group', id: activeGroup.id, title: activeGroup.name })} aria-label={`删除分组 ${activeGroup.name}`}><TrashIcon /></button>}
              </div>
            </header>

            {activeBank?.contentMode === 'questions' && activeBank.warningCount > 0 && <div className="review-notice"><WarningIcon /><div><strong>这份题库有 {activeBank.warningCount} 道题需要确认</strong><p>可以先检索使用，也可以进入校对页面修正。</p></div></div>}

            {activeGroup && managingGroup && <section className="group-manager panel"><div><h2>选择组内题库</h2><p>勾选加入分组，取消勾选即可解除编组。题库不会被删除。</p></div><div className="group-member-options">{banks.map((bank) => <label key={bank.id}><input type="checkbox" checked={selectedBankIds.includes(bank.id)} onChange={() => toggleBank(bank.id)} /><span>{bank.title}</span><small>{bank.questionCount} 题</small></label>)}</div><div className="group-manager-actions"><button className="button subtle" onClick={() => setManagingGroup(false)}>取消</button><button className="button primary" onClick={saveMembers}>保存分组</button></div></section>}

            {loadingQuestions ? <div className="empty-panel">正在载入题目…</div> : activeBankContentMissing ? <div className="empty-panel large"><WarningIcon /><h2>这次导入没有完整保存内容</h2><p>旧版本在源文件备份失败时会中断文本写入。请点击“重新导入”，内容会覆盖到当前题库并保留其分组关系。</p><Link className="button primary" to={`/import?replace=${activeBank!.id}`}>重新导入文件</Link></div> : activeBankIds.length ? <QuestionSearchResults questions={questions} banks={activeBanks} placeholder={searchingAll ? '检索全部题库和资料' : activeGroup ? '检索组内所有题库' : `检索“${activeBank?.title}”`} /> : <div className="empty-panel large"><FolderIcon /><h2>这个分组还是空的</h2><p>点击“管理成员”选择要联合检索的题库。</p></div>}
          </>
        )}
      </main>
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.kind === 'group' ? `删除分组“${confirmTarget.title}”？` : `删除“${confirmTarget?.title ?? ''}”？`}
        message={confirmTarget?.kind === 'group' ? '题库本身不会被删除，但分组关系会被清除。' : '该题库及其全部题目或文本片段将永久删除。'}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
