import { Fragment } from 'react'
import { searchTerms } from '../lib/question-search'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface HighlightedTextProps {
  text: string
  query: string
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const terms = searchTerms(query).sort((a, b) => b.length - a.length)
  if (!terms.length) return <>{text}</>

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu')
  const normalizedTerms = new Set(terms.map((term) => term.toLocaleLowerCase('zh-CN')))

  return <>{text.split(matcher).map((part, index) => (
    normalizedTerms.has(part.toLocaleLowerCase('zh-CN'))
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  ))}</>
}
