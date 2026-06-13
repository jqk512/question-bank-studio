import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BookIcon } from '../components/Icons'

type AuthMode = 'login' | 'register'

interface LoginLocationState {
  from?: string
}

function readableAuthError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : ''
  if (/invalid login credentials/i.test(message)) return '用户名或密码不正确。'
  if (/user already registered|username already registered/i.test(message)) return '这个用户名已经被注册。'
  if (/password should be at least|weak password/i.test(message)) return '密码强度不足，请使用至少 8 位且不易猜测的密码。'
  if (/rate limit/i.test(message)) return '操作过于频繁，请稍后再试。'
  if (/invite|邀请码|registration access/i.test(message)) return '邀请码无效、已过期或已达到使用上限。'
  return message || '认证操作失败，请稍后重试。'
}

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const destination = (location.state as LoginLocationState | null)?.from ?? '/'

  if (!auth.loading && auth.user) return <Navigate to={destination} replace />

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (username.trim().length < 2 || username.trim().length > 24) return setError('用户名需要 2 至 24 个字符。')
    if (password.length < 8) return setError('密码至少需要 8 位。')
    if (mode === 'register' && password !== confirmPassword) return setError('两次输入的密码不一致。')
    if (mode === 'register' && !inviteCode.trim()) return setError('请输入管理员提供的邀请码。')

    setSubmitting(true)
    try {
      if (mode === 'login') await auth.signInWithPassword(username, password)
      else await auth.signUpWithPassword(username, password, inviteCode)
    } catch (reason) {
      setError(readableAuthError(reason))
    } finally {
      setSubmitting(false)
    }
  }

  const registering = mode === 'register'

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-mark"><BookIcon /></div>
        <p className="kicker">QUESTION BANK STUDIO</p>
        <h1>{registering ? '创建你的账号' : '登录题库工坊'}</h1>
        <p className="login-copy">{registering ? '设置用户名和密码，注册后立即进入你的私有题库空间。' : '使用用户名和密码进入你的私有题库空间。'}</p>

        <div className="auth-tabs" role="tablist" aria-label="登录方式">
          <button type="button" className={!registering ? 'active' : ''} onClick={() => switchMode('login')}>登录</button>
          <button type="button" className={registering ? 'active' : ''} onClick={() => switchMode('register')}>注册</button>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>用户名<input autoComplete="username" autoFocus value={username} maxLength={24} onChange={(event) => setUsername(event.target.value)} placeholder="2 至 24 个字符" /></label>
          <label>密码<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label>
          {registering && <label>确认密码<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" /></label>}
          {registering && <label>邀请码<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="由管理员提供" /></label>}
          <button className="button primary" disabled={submitting}>{submitting ? '正在处理…' : registering ? '注册并进入工作台' : '登录'}</button>
        </form>

        {(error || !auth.configured) && <div className="login-error">{error || '当前未配置云端服务，将使用本地工作模式。'}</div>}
        <small>{registering ? '注册受服务端频率限制和邀请码保护；无需邮箱验证，请妥善保存密码。' : '用户名不区分大小写，登录状态会保存在当前浏览器中。'}</small>
      </section>
    </main>
  )
}
