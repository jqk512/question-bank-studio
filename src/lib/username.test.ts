import { describe, expect, it } from 'vitest'
import { normalizeUsername, usernameToInternalEmail } from './username'

describe('username identity', () => {
  it('normalizes case and full-width characters consistently', async () => {
    expect(normalizeUsername('  ＪQＫ  ')).toBe('jqk')
    expect(await usernameToInternalEmail('JQK')).toBe(await usernameToInternalEmail('jqk'))
  })

  it('supports long Chinese usernames without exposing them in the identifier', async () => {
    const email = await usernameToInternalEmail('复习助手复习助手复习助手复习助手复习助手复习助手')
    expect(email).toMatch(/^[0-9a-f]{64}@users\.question-bank\.example\.com$/)
    expect(email).not.toContain('复习助手')
  })
})
