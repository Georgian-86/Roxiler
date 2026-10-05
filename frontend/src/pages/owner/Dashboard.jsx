import { Store, Star, Users, MapPin } from 'lucide-react'
import useList from '../../hooks/useList'
import { PageHeader } from '../../components/Layout'
import DataTable from '../../components/DataTable'
import Pagination from '../../components/Pagination'
import StatCard from '../../components/StatCard'
import { StarDisplay } from '../../components/StarRating'

/** The owner endpoint nests the raters list, so adapt it to useList's shape. */
function useOwnerDashboard() {
  const list = useList('/owner/dashboard', { initialSort: 'updatedAt', initialOrder: 'desc' })
  const raw = list.raw
  return {
    ...list,
    store: raw?.store,
    noStore: raw && raw.store === null,
    rows: raw?.raters?.data || [],
    meta: raw?.raters?.meta,
  }
}

export default function OwnerDashboard() {
  const d = useOwnerDashboard()

  const columns = [
    { key: 'name', label: 'Customer', sortable: true, render: (r) => <span className="link-strong">{r.name}</span> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => <StarDisplay value={r.rating} /> },
    { key: 'updatedAt', label: 'Last updated', sortable: true, render: (r) => new Date(r.updatedAt).toLocaleDateString() },
  ]

  if (d.noStore) {
    return (
      <>
        <PageHeader title="My store" />
        <div className="card empty-state">
          <Store size={36} aria-hidden />
          <h2>No store assigned yet</h2>
          <p className="muted">An administrator needs to link a store to your account.</p>
        </div>
      </>
    )
  }

  const store = d.store
  const maxCount = Math.max(1, ...(store?.distribution || []).map((x) => x.count))

  return (
    <>
      <PageHeader title={store?.name || 'My store'} subtitle={store && <span className="inline-icon"><MapPin size={14} aria-hidden /> {store.address}</span>} />
      {d.error && <div className="alert alert-error" role="alert">{d.error}</div>}
      <div className="stat-grid">
        <StatCard icon={Star} label="Average rating" value={store ? (store.rating ? `${store.rating.toFixed(1)} / 5` : 'No ratings') : null} tone="warning" />
        <StatCard icon={Users} label="Total ratings" value={store?.ratingCount} tone="primary" />
      </div>
      {store && (
        <div className="card">
          <h2 className="card-title">Rating breakdown</h2>
          <ul className="dist" aria-label="Rating distribution">
            {[...store.distribution].reverse().map((x) => (
              <li key={x.rating} className="dist-row">
                <span className="dist-label">{x.rating} <Star size={12} className="star-filled" aria-hidden /></span>
                <span className="dist-bar"><span style={{ width: `${(x.count / maxCount) * 100}%` }} /></span>
                <span className="dist-count">{x.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card card-flush">
        <h2 className="card-title card-title-pad">Customers who rated your store</h2>
        <DataTable caption="Customer ratings" columns={columns} rows={d.rows} sort={d.sort} onSort={d.toggleSort} loading={d.loading} empty="No ratings yet." />
        <Pagination meta={d.meta} onPage={d.setPage} />
      </div>
    </>
  )
}
