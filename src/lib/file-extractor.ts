import { rebuildPdfPageText } from './pdf-text'

export type SupportedFileType = 'text' | 'pdf' | 'docx'

export function getSupportedFileType(file: File): SupportedFileType | null {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (extension === 'txt' || extension === 'md') return 'text'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'docx'
  return null
}

async function extractPdf(file: File) {
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
  }

  return pages.join('\n')
}

async function extractDocx(file: File) {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function extractFileText(file: File) {
  const type = getSupportedFileType(file)
  if (!type) throw new Error('暂不支持该文件格式，请上传 TXT、Markdown、DOCX 或 PDF。')
  if (type === 'text') return file.text()
  if (type === 'pdf') return extractPdf(file)
  return extractDocx(file)
}
