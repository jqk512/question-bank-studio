import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowIcon, CheckIcon, UploadIcon, WarningIcon } from '../components/Icons'
import { extractFileText, getSupportedFileType } from '../lib/file-extractor'
import { parseQuestionText } from '../lib/question-parser'
import { replaceQuestions, saveBank, uploadSourceFile } from '../lib/repository'
import { isSupabaseConfigured } from '../lib/supabase'
import { createSlug, uniqueId } from '../lib/slug'
import type { ParseResult, Question, QuestionBank } from '../types'

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const importIdRef = useRef<string | null>(null)
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function processFile(nextFile: File) {
    const supportedType = getSupportedFileType(nextFile)
    if (!supportedType) {
      setError('暂不支持该格式，请上传 TXT、Markdown、DOCX 或 PDF。')
      return
    }

    setFile(nextFile)
    importIdRef.current = uniqueId('bank')
    setProcessing(true)
    setError('')
    setResult(null)
    const suggestedTitle = nextFile.name.replace(/\.[^.]+$/, '')
    setTitle(suggestedTitle)
    setSlug(createSlug(suggestedTitle))

    try {
      const text = await extractFileText(nextFile)
      const parsed = parseQuestionText(text)
      setResult(parsed)
      if (!parsed.questions.length) setError(parsed.warnings[0] ?? '没有识别到题目。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '文件解析失败。')
    } finally {
      setProcessing(false)
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0]
    if (nextFile) void processFile(nextFile)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) void processFile(nextFile)
  }

  function processPastedText() {
    importIdRef.current = uniqueId('bank')
    const parsed = parseQuestionText(pastedText)
    setResult(parsed)
    setFile(null)
    setError(parsed.questions.length ? '' : parsed.warnings[0] ?? '没有识别到题目。')
    if (!title) {
      setTitle('未命名题库')
      setSlug(createSlug('未命名题库'))
    }
  }

  async function saveImport() {
    if (!result?.questions.length || !title.trim()) return
    setSaving(true)
    setError('')
    const bankId = importIdRef.current ?? uniqueId('bank')
    importIdRef.current = bankId
    const now = new Date().toISOString()
    const warningCount = result.questions.filter((question) => question.warnings.length > 0).length
    let bank: QuestionBank = {
      id: bankId,
      title: title.trim(),
      slug: createSlug(slug),
      description: '',
      status: 'review',
      visibility: 'private',
      sourceFileName: file?.name ?? '手动粘贴.txt',
      sourceFileType: file ? getSupportedFileType(file) ?? 'unknown' : 'text',
      questionCount: result.questions.length,
      warningCount,
      createdAt: now,
      updatedAt: now,
    }
    const questions: Question[] = result.questions.map((question) => ({
      ...question,
      id: uniqueId('question'),
      bankId,
    }))

    try {
      bank = await saveBank(bank)
      setSlug(bank.slug)
      if (file) {
        bank.sourceFilePath = await uploadSourceFile(file, bankId)
        bank = await saveBank(bank)
      }
      await replaceQuestions(bankId, questions)
      navigate(`/library/bank/${bankId}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存题库失败。')
      setSaving(false)
    }
  }

  const warningCount = result?.questions.filter((question) => question.warnings.length).length ?? 0

  return (
    <>
      <section className="page-heading narrow-heading">
        <div><p className="kicker">IMPORT PIPELINE</p><h1>导入一份新题库</h1><p>文件将在浏览器本地提取和拆分，提交前可以检查识别结果。</p></div>
      </section>

      <div className="import-layout">
        <section className="panel import-panel">
          <div className="step-label"><span>01</span>选择源文件</div>
          <div className={`drop-zone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".txt,.md,.docx,.pdf" onChange={onFileChange} hidden />
            <span className="drop-icon">{file ? <CheckIcon /> : <UploadIcon />}</span>
            <h2>{file ? file.name : '拖入文件，或点击选择'}</h2>
            <p>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'TXT · Markdown · DOCX · 文字型 PDF'}</p>
            <button type="button" className="button subtle">{file ? '重新选择' : '选择文件'}</button>
          </div>
          <div className="privacy-note"><strong>{isSupabaseConfigured ? '私有云端' : '本地优先'}</strong><span>{isSupabaseConfigured ? '源文件会上传到仅你可访问的私有存储空间。' : '当前版本不会把源文件上传到服务器。'}</span></div>
          <details className="paste-source">
            <summary>没有文件？直接粘贴题库文本</summary>
            <textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder={'1. 示例题目\nA. 选项一\nB. 选项二\n答案：A'} />
            <button type="button" className="button dark" onClick={processPastedText} disabled={!pastedText.trim()}>解析粘贴内容</button>
          </details>
        </section>

        <section className="panel import-panel">
          <div className="step-label"><span>02</span>确认解析结果</div>
          {processing ? (
            <div className="processing-state"><i /><h2>正在提取和拆分题目</h2><p>较大的 PDF 可能需要一些时间。</p></div>
          ) : result?.questions.length ? (
            <>
              <div className="parse-summary">
                <div><span>识别题目</span><strong>{result.questions.length}</strong></div>
                <div><span>可直接使用</span><strong>{result.questions.length - warningCount}</strong></div>
                <div className={warningCount ? 'warn' : ''}><span>需要检查</span><strong>{warningCount}</strong></div>
              </div>
              {result.warnings.length > 0 && <div className="warning-strip"><WarningIcon />{result.warnings.join('；')}</div>}
              <label className="field-label">题库名称<input value={title} onChange={(event) => { setTitle(event.target.value); setSlug(createSlug(event.target.value)) }} /></label>
              <label className="field-label">链接标识<input value={slug} onChange={(event) => setSlug(event.target.value)} /><small>发布后用于生成独立检索链接</small></label>
              <div className="sample-preview">
                <span>识别预览</span>
                <strong>{result.questions[0].sequence}. {result.questions[0].stem}</strong>
                <p>{result.questions[0].options.slice(0, 2).map((option) => `${option.label}. ${option.text}`).join('　')}</p>
              </div>
              <button className="button primary wide" type="button" onClick={saveImport} disabled={saving}>{saving ? '正在保存…' : '保存并进入校对'}<ArrowIcon /></button>
            </>
          ) : (
            <div className="placeholder-state"><span>02</span><h2>等待文件解析</h2><p>选择文件后，这里会显示识别数量、异常和题目预览。</p></div>
          )}
          {error && <div className="error-message"><WarningIcon />{error}</div>}
        </section>
      </div>
    </>
  )
}
