import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BookIcon, GridIcon, UploadIcon } from './Icons'
import { BackgroundPanel } from './BackgroundPanel'
import type { BackgroundSettings } from '../lib/background-settings'

interface AppShellProps {
  bgSettings: BackgroundSettings
  onBgChange: (changes: Partial<BackgroundSettings>) => void
}

export function AppShell({ bgSettings, onBgChange }: AppShellProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const displayName = typeof auth.user?.user_metadata.username === 'string'
    ? auth.user.user_metadata.username
    : '已登录用户'

  async function logout() {
    await auth.signOut()
    navigate('/login')
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="题库工坊首页">
          <span className="brand-mark">Q</span>
          <span><strong>题库工坊</strong><small>Question Studio</small></span>
        </NavLink>

        <nav className="main-nav" aria-label="主导航">
          <NavLink to="/" end><GridIcon />题库工作区</NavLink>
          <NavLink to="/import"><UploadIcon />导入题库</NavLink>
        </nav>

        {/* Bottom section: bg panel + info note */}
        <div className="sidebar-footer">
          <BackgroundPanel settings={bgSettings} onChange={onBgChange} />
          <div className="sidebar-note">
            <BookIcon />
            <p>
              <strong>{auth.configured ? '云端同步模式' : '本地工作模式'}</strong>
              {auth.configured ? '题库与源文件保存在你的私有云端空间。' : '当前数据仅保存在这台设备的浏览器中。'}
            </p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span className="environment-pill">
            <i /> {auth.configured ? 'CLOUD WORKSPACE' : 'LOCAL WORKSPACE'}
          </span>
          <div className="account-menu">
            <span>{auth.user ? displayName : '本地模式'}</span>
            {auth.user && <button onClick={logout}>退出</button>}
          </div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  )
}
