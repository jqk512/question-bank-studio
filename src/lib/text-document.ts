import type { ParsedQuestion } from '../types'

const TARGET_CHUNK_SIZE = 700

function normalizeText(source: string) {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function createTextEntries(source: string): ParsedQuestion[] {
  const normalized = normalizeText(source)
  if (!normalized) return []

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > TARGET_CHUNK_SIZE) {
      chunks.push(current)
      current = ''
    }
    if (paragraph.length > TARGET_CHUNK_SIZE * 1.5) {
      if (current) chunks.push(current)
      for (let start = 0; start < paragraph.length; start += TARGET_CHUNK_SIZE) {
        chunks.push(paragraph.slice(start, start + TARGET_CHUNK_SIZE))
      }
      continue
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph
  }
  if (current) chunks.push(current)

  return chunks.map((text, index) => ({
    sequence: index + 1,
    displayNumber: index + 1,
    type: 'unknown',
    stem: text,
    options: [],
    answer: [],
    answerText: [],
    explanation: '',
    rawText: text,
    confidence: 1,
    warnings: [],
  }))
}
