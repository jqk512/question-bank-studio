const MAX_SLUG_LENGTH = 160

export function createSlug(value: string) {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

  return normalized || `bank-${Date.now().toString(36)}`
}

export function createUniqueSlug(value: string, id: string) {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, '').toLocaleLowerCase('en-US') || crypto.randomUUID().replaceAll('-', '')
  const base = createSlug(value)
    .slice(0, MAX_SLUG_LENGTH - suffix.length - 1)
    .replace(/-+$/g, '') || 'bank'
  return `${base}-${suffix}`
}

export function uniqueId(prefix: string) {
  void prefix
  return crypto.randomUUID()
}
