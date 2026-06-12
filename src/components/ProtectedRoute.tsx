import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.configured) return <Outlet />
  if (auth.loading) return <div className="auth-loading">正在检查登录状态…</div>
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
