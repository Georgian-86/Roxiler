import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Store, Star, UserPlus, Plus } from 'lucide-react'
import api, { parseError } from '../../api/client'
import { PageHeader } from '../../components/Layout'
import StatCard from '../../components/StatCard'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setStats(r.data)).catch((e) => setError(parseError(e).message))
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Platform overview at a glance." />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="stat-grid">
        <StatCard icon={Users} label="Total users" value={stats?.totalUsers} tone="primary" />
        <StatCard icon={Store} label="Total stores" value={stats?.totalStores} tone="success" />
        <StatCard icon={Star} label="Ratings submitted" value={stats?.totalRatings} tone="warning" />
      </div>
      <div className="card quick-actions">
        <h2>Quick actions</h2>
        <div className="quick-actions-row">
          <Link to="/admin/users?new=1" className="btn btn-primary"><UserPlus size={18} aria-hidden /> Add user</Link>
          <Link to="/admin/stores?new=1" className="btn btn-secondary"><Plus size={18} aria-hidden /> Add store</Link>
        </div>
      </div>
    </>
  )
}
