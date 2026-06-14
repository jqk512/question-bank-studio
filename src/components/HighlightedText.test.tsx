import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HighlightedText } from './HighlightedText'

describe('HighlightedText', () => {
  it('highlights every query term without changing surrounding text', () => {
    const html = renderToStaticMarkup(<HighlightedText text="机器人竞赛招募方案" query="机器人 招募" />)
    expect(html).toContain('<mark>机器人</mark>竞赛<mark>招募</mark>方案')
  })

  it('escapes regular expression characters in queries', () => {
    const html = renderToStaticMarkup(<HighlightedText text="C++ 入门" query="C++" />)
    expect(html).toContain('<mark>C++</mark>')
  })
})
