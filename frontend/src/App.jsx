import { Navigate, Route, Routes } from 'react-router-dom'
import { HOME_BY_ROLE } from './utils/constants'
import { useAuth } from './context/AuthContext'
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminUserDetail from './pages/admin/UserDetail'
import AdminStores from './pages/admin/Stores'
import StoreList from './pages/user/StoreList'
import OwnerDashboard from './pages/owner/Dashboard'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            <Route path="/admin/stores" element={<AdminStores />} />
          </Route>
          <Route element={<ProtectedRoute roles={['USER']} />}>
            <Route path="/stores" element={<StoreList />} />
          </Route>
          <Route element={<ProtectedRoute roles={['OWNER']} />}>
            <Route path="/owner" element={<OwnerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN', 'USER', 'OWNER']} />}>
            <Route path="/account/password" element={<ChangePassword />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
