import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Store, CalendarDays } from 'lucide-react'
import api, { parseError } from '../../api/client'
import { PageHeader } from '../../components/Layout'
import RoleBadge from '../../components/RoleBadge'
import { RatingBadge } from '../../components/StarRating'

export default function UserDetail() {
  const { id } = useParams()
  // Tagged with the id it belongs to, so a stale result is never shown for another user.
  const [result, setResult] = useState({ id: null, user: null, error: '' })

  useEffect(() => {
    let active = true
    api
      .get(`/admin/users/${id}`)
      .then((r) => active && setResult({ id, user: r.data.user, error: '' }))
      .catch((e) => active && setResult({ id, user: null, error: parseError(e).message }))
    return () => { active = false }
  }, [id])

  const current = result.id === id ? result : { user: null, error: '' }
  const { user, error } = current

  return (
    <>
      <Link to="/admin/users" className="back-link"><ArrowLeft size={16} aria-hidden /> Back to users</Link>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!user && !error && <div className="card"><span className="skeleton skeleton-lg" /></div>}
      {user && (
        <>
          <PageHeader title={user.name} actions={<RoleBadge role={user.role} />} />
          <div className="card detail-card">
            <dl className="detail-list">
              <div><dt><Mail size={16} aria-hidden /> Email</dt><dd>{user.email}</dd></div>
              <div><dt><MapPin size={16} aria-hidden /> Address</dt><dd>{user.address}</dd></div>
              <div><dt><CalendarDays size={16} aria-hidden /> Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd></div>
              <div><dt>Role</dt><dd><RoleBadge role={user.role} /></dd></div>
              {user.role === 'OWNER' && (
                <>
                  <div><dt><Store size={16} aria-hidden /> Store</dt><dd>{user.store ? user.store.name : <span className="muted">No store assigned</span>}</dd></div>
                  <div><dt>Rating</dt><dd><RatingBadge value={user.rating} /></dd></div>
                </>
              )}
            </dl>
          </div>
        </>
      )}
    </>
  )
}
