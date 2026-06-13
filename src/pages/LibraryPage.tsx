import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { BookIcon, FolderIcon, PlusIcon, SettingsIcon, TrashIcon, UploadIcon, WarningIcon } from '../components/Icons'
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
  const navigate = useNavigate()
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
    if (activeBank) return [activeBank.id]
    if (activeGroup) return memberships.filter((membership) => membership.groupId === activeGroup.id).map((membership) => membership.bankId)
    return []
  }, [activeBank, activeGroup, memberships])
  const activeBanks = banks.filter((bank) => activeBankIds.includes(bank.id))
  const activeQuestionKey = activeBankIds.join('|')
  const loadingQuestions = Boolean(activeQuestionKey && loadedQuestionKey !== activeQuestionKey)

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

  async function removeGroup() {
    if (!activeGroup || !window.confirm(`确认删除分组“${activeGroup.name}”？题库本身不会被删除。`)) return
    await deleteGroup(activeGroup.id)
    await refreshLibrary()
    navigate('/')
  }

  async function removeBank(bank: QuestionBank) {
    if (!window.confirm(`确认删除“${bank.title}”及其全部题目？`)) return
    await deleteBank(bank.id)
    await refreshLibrary()
    if (bank.id === bankId) navigate('/')
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

  if (loading) return <div className="empty-panel">正在读取题库工作区…</div>

  return (
    <div className="library-workspace">
      <aside className="library-rail panel">
        <div className="library-rail-heading"><div><p className="kicker">YOUR LIBRARY</p><h1>题库列表</h1></div><Link className="rail-icon-button" to="/import" aria-label="导入新题库"><UploadIcon /></Link></div>
        <button className="new-group-button" type="button" onClick={() => setCreatingGroup((value) => !value)}><PlusIcon />新建分组</button>
        {creatingGroup && <div className="new-group-form"><input autoFocus value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createGroup() }} placeholder="例如：期末复习" /><button onClick={createGroup}>创建</button></div>}

        <div className="library-list">
          {groups.map((group) => {
            const groupBankIds = memberships.filter((membership) => membership.groupId === group.id).map((membership) => membership.bankId)
            const groupBanks = banks.filter((bank) => groupBankIds.includes(bank.id))
            return <div className="library-group" key={group.id}>
              <NavLink className="group-link" to={`/library/group/${group.id}`} onClick={() => setManagingGroup(false)}><FolderIcon /><span>{group.name}</span><b>{groupBanks.length}</b></NavLink>
              <div className="group-bank-list">{groupBanks.map((bank) => <NavLink to={`/library/bank/${bank.id}`} onClick={() => setManagingGroup(false)} key={bank.id}><span>{bank.title.slice(0, 1)}</span><div><strong>{bank.title}</strong><small>{bank.questionCount} 道题</small></div></NavLink>)}</div>
            </div>
          })}
          {ungroupedBanks.length > 0 && <div className="library-group"><div className="group-label"><BookIcon />未编组 <b>{ungroupedBanks.length}</b></div><div className="group-bank-list">{ungroupedBanks.map((bank) => <NavLink to={`/library/bank/${bank.id}`} onClick={() => setManagingGroup(false)} key={bank.id}><span>{bank.title.slice(0, 1)}</span><div><strong>{bank.title}</strong><small>{bank.questionCount} 道题</small></div></NavLink>)}</div></div>}
        </div>
      </aside>

      <main className="library-main">
        {error && <div className="error-message library-error"><WarningIcon />{error}</div>}
        {!activeBank && !activeGroup ? (
          <section className="library-welcome panel"><span className="empty-icon"><BookIcon /></span><p className="kicker">SEARCH WORKSPACE</p><h2>{banks.length ? '选择一个题库或分组开始检索' : '导入第一份题库'}</h2><p>{banks.length ? '左侧每份题库都是独立子列表；选择分组后可同时检索组内全部题目。' : '上传文件后会自动建立独立题库子列表。'}</p><Link className="button primary" to="/import"><UploadIcon />导入新题库</Link></section>
        ) : (
          <>
            <header className="library-target-header">
              <div><p className="kicker">{activeGroup ? 'GROUP SEARCH' : 'QUESTION BANK'}</p><h1>{activeGroup?.name ?? activeBank?.title}</h1><p>{activeGroup ? `${activeBanks.length} 份题库 · ${activeBanks.reduce((sum, bank) => sum + bank.questionCount, 0)} 道题` : `${activeBank?.sourceFileName} · ${activeBank?.questionCount} 道题`}</p></div>
              <div className="library-target-actions">
                {activeBank && <button className="icon-button danger" onClick={() => removeBank(activeBank)} aria-label={`删除 ${activeBank.title}`}><TrashIcon /></button>}
                {activeBank && <Link className="button subtle" to={`/review/${activeBank.id}`}>校对与发布</Link>}
                {activeGroup && <button className="button subtle" onClick={toggleGroupManager}><SettingsIcon />管理成员</button>}
                {activeGroup && <button className="icon-button danger" onClick={removeGroup} aria-label={`删除分组 ${activeGroup.name}`}><TrashIcon /></button>}
              </div>
            </header>

            {activeBank && activeBank.warningCount > 0 && <div className="review-notice"><WarningIcon /><div><strong>这份题库有 {activeBank.warningCount} 道题需要确认</strong><p>可以先检索使用，也可以进入校对页面修正。</p></div></div>}

            {activeGroup && managingGroup && <section className="group-manager panel"><div><h2>选择组内题库</h2><p>勾选加入分组，取消勾选即可解除编组。题库不会被删除。</p></div><div className="group-member-options">{banks.map((bank) => <label key={bank.id}><input type="checkbox" checked={selectedBankIds.includes(bank.id)} onChange={() => toggleBank(bank.id)} /><span>{bank.title}</span><small>{bank.questionCount} 题</small></label>)}</div><div className="group-manager-actions"><button className="button subtle" onClick={() => setManagingGroup(false)}>取消</button><button className="button primary" onClick={saveMembers}>保存分组</button></div></section>}

            {loadingQuestions ? <div className="empty-panel">正在载入题目…</div> : activeBankIds.length ? <QuestionSearchResults questions={questions} banks={activeBanks} placeholder={activeGroup ? '检索组内所有题库' : `检索“${activeBank?.title}”`} /> : <div className="empty-panel large"><FolderIcon /><h2>这个分组还是空的</h2><p>点击“管理成员”选择要联合检索的题库。</p></div>}
          </>
        )}
      </main>
    </div>
  )
}
