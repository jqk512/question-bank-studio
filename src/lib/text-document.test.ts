import { describe, expect, it } from 'vitest'
import { createTextEntries } from './text-document'

describe('createTextEntries', () => {
  it('turns ordinary documents into searchable text entries', () => {
    const entries = createTextEntries('第一段介绍。\n\n第二段包含神经网络知识。')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ type: 'unknown', options: [], answer: [] })
    expect(entries[0].stem).toContain('神经网络')
  })

  it('splits long documents into bounded entries', () => {
    const entries = createTextEntries('知识'.repeat(900))
    expect(entries.length).toBeGreaterThan(1)
    expect(entries.every((entry) => entry.stem.length <= 700)).toBe(true)
  })
})
