import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { rebuildPdfPageText } from '../src/lib/pdf-text'
import { parseQuestionText } from '../src/lib/question-parser'

async function extractPdf(path: string) {
  const document = await getDocument({ data: new Uint8Array(await readFile(path)) }).promise
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

const input = process.argv[2]
if (!input) throw new Error('Usage: npm run analyze:pdf -- /absolute/path/to/file.pdf')

const path = resolve(input)
const text = await extractPdf(path)
const result = parseQuestionText(text)
const warningQuestions = result.questions.filter((question) => question.warnings.length > 0)

console.log(JSON.stringify({
  file: basename(path),
  extractedCharacters: text.length,
  questions: result.questions.length,
  warningQuestions: warningQuestions.length,
  globalWarnings: result.warnings,
  firstQuestion: result.questions[0]?.stem,
  lastQuestion: result.questions.at(-1)?.stem,
  warningSamples: warningQuestions.slice(0, 5).map((question) => ({
    sequence: question.sequence,
    warnings: question.warnings,
    stem: question.stem,
    options: question.options.map((option) => option.label),
    rawText: question.rawText.slice(0, 350),
  })),
}, null, 2))
