export function normalizeUsername(username: string) {
  return username.normalize('NFKC').trim().toLocaleLowerCase('zh-CN')
}

export async function usernameToInternalEmail(username: string) {
  const bytes = new TextEncoder().encode(normalizeUsername(username))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const identifier = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${identifier}@users.question-bank.example.com`
}
