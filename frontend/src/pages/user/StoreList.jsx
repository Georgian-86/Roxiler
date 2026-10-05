import useList from '../../hooks/useList'
import { PageHeader } from '../../components/Layout'
import DataTable from '../../components/DataTable'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { RatingBadge } from '../../components/StarRating'
import { useAuth } from '../../context/AuthContext'
import RateCell from './RateCell'

const FILTERS = [
  { key: 'name', label: 'Name', placeholder: 'Search by store name' },
  { key: 'address', label: 'Address', placeholder: 'Search by address' },
]

export default function StoreList() {
  const { user } = useAuth()
  const list = useList('/stores', { initialFilters: { name: '', address: '' } })

  const handleRated = (storeId, result) => {
    // A rating changes the row's position when sorting by rating, so refetch instead.
    if (['rating', 'myRating'].includes(list.sort.sortBy)) return list.reload()
    list.setState((s) => ({
      ...s,
      data: s.data.map((row) =>
        row.id === storeId ? { ...row, myRating: result.myRating, rating: result.rating, ratingCount: result.ratingCount } : row,
      ),
    }))
  }

  const columns = [
    { key: 'name', label: 'Store', sortable: true, render: (s) => <span className="link-strong">{s.name}</span> },
    { key: 'address', label: 'Address', sortable: true, className: 'cell-wrap' },
    { key: 'rating', label: 'Overall rating', sortable: true, render: (s) => <RatingBadge value={s.rating} count={s.ratingCount} /> },
    {
      key: 'myRating', label: 'Your rating', sortable: true,
      render: (s) => (s.myRating ? <span className="badge badge-user">{s.myRating} / 5</span> : <span className="muted">Not rated</span>),
    },
    // Keyed by myRating so the picker resets when the saved value changes.
    { key: 'rate', label: 'Rate', render: (s) => <RateCell key={`${s.id}-${s.myRating}`} store={s} onRated={handleRated} /> },
  ]

  return (
    <>
      <PageHeader title="Browse stores" subtitle={`Hi ${user.name.split(' ')[0]}, find a store and share your rating.`} />
      <div className="card card-flush">
        <FilterBar fields={FILTERS} filters={list.filters} onChange={list.setFilter} onClear={list.clearFilters} />
        {list.error && <div className="alert alert-error" role="alert">{list.error}</div>}
        <DataTable caption="Stores" columns={columns} rows={list.data} sort={list.sort} onSort={list.toggleSort} loading={list.loading} empty="No stores match your search." />
        <Pagination meta={list.meta} onPage={list.setPage} />
      </div>
    </>
  )
}
