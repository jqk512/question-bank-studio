import { describe, expect, it } from 'vitest'
import { createSlug, createUniqueSlug } from './slug'

describe('question bank slugs', () => {
  it('normalizes readable Chinese slugs and respects the database limit', () => {
    expect(createSlug('  人工智能导论_习题汇总 v6  ')).toBe('人工智能导论-习题汇总-v6')
    expect(createSlug('题'.repeat(200))).toHaveLength(160)
  })

  it('adds a deterministic bank id suffix when the readable slug is occupied', () => {
    const slug = createUniqueSlug('人工智能导论-习题汇总-v6', '9f471b5e-8a87-4d89-993f-a88d4f9efe77')
    expect(slug).toBe('人工智能导论-习题汇总-v6-9f471b5e8a874d89993fa88d4f9efe77')
    expect(slug.length).toBeLessThanOrEqual(160)
  })
})
