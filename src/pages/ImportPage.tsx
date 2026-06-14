import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowIcon, CheckIcon, UploadIcon, WarningIcon } from '../components/Icons'
import { extractFileText, getSupportedFileType } from '../lib/file-extractor'
import { parseQuestionText } from '../lib/question-parser'
import { getBank, replaceQuestions, saveBank, uploadSourceFile } from '../lib/repository'
import { isSupabaseConfigured } from '../lib/supabase'
import { createSlug, uniqueId } from '../lib/slug'
import { createTextEntries } from '../lib/text-document'
import type { ParseResult, Question, QuestionBank } from '../types'

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const importIdRef = useRef<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replaceBankId = searchParams.get('replace')
  const [existingBank, setExistingBank] = useState<QuestionBank | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [contentMode, setContentMode] = useState<QuestionBank['contentMode']>('questions')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!replaceBankId) return
    getBank(replaceBankId).then((bank) => {
      if (!bank) throw new Error('找不到需要更新的题库。')
      setExistingBank(bank)
      importIdRef.current = bank.id
      setTitle(bank.title)
      setSlug(bank.slug)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '读取原题库失败。'))
  }, [replaceBankId])

  async function processFile(nextFile: File) {
    const supportedType = getSupportedFileType(nextFile)
    if (!supportedType) {
      setError('暂不支持该格式，请上传 TXT、Markdown、DOCX 或 PDF。')
      return
    }

    setFile(nextFile)
    importIdRef.current = existingBank?.id ?? uniqueId('bank')
    setProcessing(true)
    setProgress(null)
    setError('')
    setResult(null)
    const suggestedTitle = nextFile.name.replace(/\.[^.]+$/, '')
    setTitle(existingBank?.title ?? suggestedTitle)
    setSlug(existingBank?.slug ?? createSlug(suggestedTitle))

    try {
      const text = await extractFileText(nextFile, ({ current, total }) => setProgress({ current, total }))
      const parsed = parseQuestionText(text)
      const hasStructuredQuestions = parsed.questions.some((question) => question.type !== 'unknown')
      if (hasStructuredQuestions) {
        setContentMode('questions')
        setResult(parsed)
      } else {
        const textEntries = createTextEntries(text)
        setContentMode('text')
        setResult({ questions: textEntries, sourceText: text, warnings: textEntries.length ? ['未识别到选择题或判断题，已切换为文本资料模式。'] : parsed.warnings })
        if (!textEntries.length) setError('文件中没有提取到可检索文字。')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '文件解析失败。')
    } finally {
      setProcessing(false)
      setProgress(null)
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
    importIdRef.current = existingBank?.id ?? uniqueId('bank')
    const parsed = parseQuestionText(pastedText)
    const hasStructuredQuestions = parsed.questions.some((question) => question.type !== 'unknown')
    const nextResult = hasStructuredQuestions
      ? parsed
      : { questions: createTextEntries(pastedText), sourceText: pastedText, warnings: ['未识别到选择题或判断题，已切换为文本资料模式。'] }
    setContentMode(hasStructuredQuestions ? 'questions' : 'text')
    setResult(nextResult)
    setFile(null)
    setError(nextResult.questions.length ? '' : parsed.warnings[0] ?? '没有提取到可检索文字。')
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
      description: existingBank?.description ?? '',
      status: existingBank?.status ?? 'review',
      visibility: existingBank?.visibility ?? 'private',
      contentMode,
      sourceFileName: file?.name ?? '手动粘贴.txt',
      sourceFileType: file ? getSupportedFileType(file) ?? 'unknown' : 'text',
      questionCount: result.questions.length,
      warningCount,
      createdAt: existingBank?.createdAt ?? now,
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
      await replaceQuestions(bankId, questions)
      let sourceUploadWarning = ''
      if (file) {
        try {
          bank.sourceFilePath = await uploadSourceFile(file, bankId)
          bank = await saveBank(bank)
        } catch (reason) {
          sourceUploadWarning = reason instanceof Error ? reason.message : '源文件备份失败。'
        }
      }
      navigate(`/library/bank/${bankId}`, {
        state: sourceUploadWarning ? { notice: `文本内容已保存并可检索，但源文件云端备份失败：${sourceUploadWarning}` } : undefined,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存题库失败。')
      setSaving(false)
    }
  }

  const warningCount = result?.questions.filter((question) => question.warnings.length).length ?? 0

  return (
    <>
      <section className="page-heading narrow-heading">
        <div><p className="kicker">IMPORT PIPELINE</p><h1>{existingBank ? `更新“${existingBank.title}”` : '导入一份新题库'}</h1><p>{existingBank ? '新内容会覆盖这份题库，原有分组关系和发布链接保持不变。' : '文件将在浏览器本地提取和拆分，扫描版 PDF 会先被识别并提示 OCR 处理。'}</p></div>
      </section>

      <div className="import-layout">
        <section className="panel import-panel">
          <div className="step-label"><span>01</span>选择源文件</div>
          <div className={`drop-zone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".txt,.md,.docx,.pdf" onChange={onFileChange} hidden />
            <span className="drop-icon">{file ? <CheckIcon /> : <UploadIcon />}</span>
            <h2>{file ? file.name : '拖入文件，或点击选择'}</h2>
            <p>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'TXT · Markdown · DOCX · PDF（扫描件检测）'}</p>
            <button type="button" className="button subtle">{file ? '重新选择' : '选择文件'}</button>
          </div>
          <div className="privacy-note"><strong>{isSupabaseConfigured ? '私有云端' : '本地优先'}</strong><span>{isSupabaseConfigured ? '源文件会上传到仅你可访问的私有存储空间。' : '当前版本不会把源文件上传到服务器。'}</span></div>
          <details className="paste-source">
            <summary>没有文件？直接粘贴题库文本</summary>
            <textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder={'1. 示例题目\nA. 选项一\nB. 选项二\n答案：A'} />
            <button type="button" className="button dark" onClick={processPastedText} disabled={!pastedText.trim()}>解析粘贴内容</button>
          </details>
          <details className="format-example">
            <summary>查看支持的题库格式示例</summary>
            <pre>{'1. 下列哪项正确？\nA. 选项一\nB. 选项二\n答案：A\n\n普通文档无需套用格式，会自动进入文本检索模式。'}</pre>
          </details>
        </section>

        <section className="panel import-panel">
          <div className="step-label"><span>02</span>确认解析结果</div>
          {processing ? (
            <div className="processing-state"><i /><h2>正在提取和拆分内容</h2><p>{progress ? `正在读取第 ${progress.current} / ${progress.total} 页（${Math.round(progress.current / progress.total * 100)}%）` : '正在读取文档内容，请稍候。'}</p></div>
          ) : result?.questions.length ? (
            <>
              <div className="parse-summary">
                <div><span>{contentMode === 'text' ? '文本片段' : '识别题目'}</span><strong>{result.questions.length}</strong></div>
                <div><span>{contentMode === 'text' ? '检索模式' : '可直接使用'}</span><strong>{contentMode === 'text' ? '文本' : result.questions.length - warningCount}</strong></div>
                <div className={warningCount ? 'warn' : ''}><span>需要检查</span><strong>{contentMode === 'text' ? 0 : warningCount}</strong></div>
              </div>
              {result.warnings.length > 0 && <div className="warning-strip"><WarningIcon />{result.warnings.join('；')}</div>}
              <label className="field-label">题库名称<input value={title} onChange={(event) => { setTitle(event.target.value); setSlug(createSlug(event.target.value)) }} /></label>
              <label className="field-label">链接标识<input value={slug} onChange={(event) => setSlug(event.target.value)} /><small>发布后用于生成独立检索链接</small></label>
              <div className="sample-preview">
                <span>{contentMode === 'text' ? '文本预览' : '识别预览'}</span>
                <strong>{contentMode === 'text' ? result.questions[0].stem : `${result.questions[0].sequence}. ${result.questions[0].stem}`}</strong>
                {contentMode === 'questions' && <p>{result.questions[0].options.slice(0, 2).map((option) => `${option.label}. ${option.text}`).join('　')}</p>}
              </div>
              <button className="button primary wide" type="button" onClick={saveImport} disabled={saving}>{saving ? '正在保存…' : contentMode === 'text' ? '保存并进入检索' : '保存并进入校对'}<ArrowIcon /></button>
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
