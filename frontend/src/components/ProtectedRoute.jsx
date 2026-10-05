import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { HOME_BY_ROLE } from '../utils/constants'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loader" aria-busy="true">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  return <Outlet />
}

export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loader" aria-busy="true">Loading…</div>
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  return <Outlet />
}
