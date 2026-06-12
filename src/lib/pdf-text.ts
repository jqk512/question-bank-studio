interface PdfTextItem {
  str: string
  hasEOL?: boolean
}

export function rebuildPdfPageText(items: Array<PdfTextItem | unknown>) {
  const lines: string[] = []
  let line = ''

  for (const item of items) {
    if (!item || typeof item !== 'object' || !('str' in item)) continue
    const textItem = item as PdfTextItem
    line += textItem.str
    if (textItem.hasEOL) {
      if (line.trim()) lines.push(line.trim())
      line = ''
    }
  }

  if (line.trim()) lines.push(line.trim())
  return lines.join('\n')
}
