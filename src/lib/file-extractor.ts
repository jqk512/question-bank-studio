import { rebuildPdfPageText } from './pdf-text'

export type SupportedFileType = 'text' | 'pdf' | 'docx'

export interface PdfTextAssessment {
  pageCount: number
  textPageCount: number
  characterCount: number
  likelyScanned: boolean
}

export interface ExtractionProgress {
  current: number
  total: number
  phase: 'extracting'
}

export function getSupportedFileType(file: File): SupportedFileType | null {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (extension === 'txt' || extension === 'md') return 'text'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  return null
}

export function assessPdfTextExtraction(pages: string[]): PdfTextAssessment {
  const characterCounts = pages.map((page) => page.replace(/\s/g, '').length)
  const characterCount = characterCounts.reduce((sum, count) => sum + count, 0)
  const textPageCount = characterCounts.filter((count) => count >= 20).length
  const pageCount = pages.length
  const textPageRatio = pageCount ? textPageCount / pageCount : 0
  const likelyScanned = characterCount < 20
    || (pageCount >= 3 && textPageRatio < 0.2 && characterCount < pageCount * 40)

  return { pageCount, textPageCount, characterCount, likelyScanned }
}

async function extractPdf(file: File, onProgress?: (progress: ExtractionProgress) => void) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines = rebuildPdfPageText(content.items).split('\n')
    if (/^\d{1,4}$/.test(lines[0]?.trim())) lines.shift()
    if (/^\d{1,4}$/.test(lines.at(-1)?.trim() ?? '')) lines.pop()
    pages.push(lines.join('\n'))
    onProgress?.({ current: pageNumber, total: document.numPages, phase: 'extracting' })
  }

  const assessment = assessPdfTextExtraction(pages)
  if (assessment.likelyScanned) {
    throw new Error(`检测到扫描版 PDF（${assessment.pageCount} 页，未提取到足够文字）。这类文件需要 OCR 识别，请先转换为可搜索 PDF 或等待 OCR 模块处理。`)
  }

  return pages.join('\n')
}

async function extractDocx(file: File) {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function extractFileText(file: File, onProgress?: (progress: ExtractionProgress) => void) {
  const type = getSupportedFileType(file)
  if (!type) throw new Error('暂不支持该文件格式，请上传 TXT、Markdown、DOCX 或 PDF。')
  if (type === 'text') return file.text()
  if (type === 'pdf') return extractPdf(file, onProgress)
  return extractDocx(file)
}
