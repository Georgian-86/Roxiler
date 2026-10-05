import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Store, KeyRound, LogOut, Menu, Star, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RoleBadge from './RoleBadge'

const NAV = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/stores', label: 'Stores', icon: Store },
    { to: '/account/password', label: 'Change Password', icon: KeyRound },
  ],
  USER: [
    { to: '/stores', label: 'Browse Stores', icon: Store },
    { to: '/account/password', label: 'Change Password', icon: KeyRound },
  ],
  OWNER: [
    { to: '/owner', label: 'My Store', icon: LayoutDashboard, end: true },
    { to: '/account/password', label: 'Change Password', icon: KeyRound },
  ],
}

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden><Star size={18} /></span>
      StoreRate
    </span>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={22} />
        </button>
        <Brand />
      </header>

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Primary">
        <div className="sidebar-head">
          <Brand />
          <button type="button" className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav className="nav">
          {NAV[user.role].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar" aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
            <div className="user-chip-text">
              <span className="user-chip-name" title={user.name}>{user.name}</span>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={handleLogout}>
            <LogOut size={18} aria-hidden /> Log out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}

      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
