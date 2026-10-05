import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import useList from '../../hooks/useList'
import { PageHeader } from '../../components/Layout'
import DataTable from '../../components/DataTable'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import { RatingBadge } from '../../components/StarRating'
import { useToast } from '../../context/ToastContext'
import StoreForm from './StoreForm'

const FILTERS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
]

export default function Stores() {
  const list = useList('/admin/stores', { initialFilters: { name: '', email: '', address: '' } })
  const [params, setParams] = useSearchParams()
  const notify = useToast()
  const open = params.get('new') === '1'
  const close = () => setParams({}, { replace: true })

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (s) => <span className="link-strong">{s.name}</span> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true, className: 'cell-wrap' },
    {
      key: 'owner', label: 'Owner',
      render: (s) => (s.ownerId ? <Link to={`/admin/users/${s.ownerId}`}>{s.ownerName}</Link> : <span className="muted">Unassigned</span>),
    },
    { key: 'rating', label: 'Rating', sortable: true, render: (s) => <RatingBadge value={s.rating} count={s.ratingCount} /> },
  ]

  return (
    <>
      <PageHeader
        title="Stores"
        subtitle="Every store registered on the platform."
        actions={<button type="button" className="btn btn-primary" onClick={() => setParams({ new: '1' })}><Plus size={18} aria-hidden /> Add store</button>}
      />
      <div className="card card-flush">
        <FilterBar fields={FILTERS} filters={list.filters} onChange={list.setFilter} onClear={list.clearFilters} />
        {list.error && <div className="alert alert-error" role="alert">{list.error}</div>}
        <DataTable caption="Stores" columns={columns} rows={list.data} sort={list.sort} onSort={list.toggleSort} loading={list.loading} empty="No stores match these filters." />
        <Pagination meta={list.meta} onPage={list.setPage} />
      </div>
      <Modal open={open} onClose={close} title="Add store">
        <StoreForm
          onCancel={close}
          onCreated={(s) => { close(); notify(`${s.name} was added`); list.reload() }}
        />
      </Modal>
    </>
  )
}
