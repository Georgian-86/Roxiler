import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, UserCog } from 'lucide-react'
import useList from '../../hooks/useList'
import { PageHeader } from '../../components/Layout'
import DataTable from '../../components/DataTable'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import { RatingBadge } from '../../components/StarRating'
import { useToast } from '../../context/ToastContext'
import StoreForm from './StoreForm'
import AssignOwnerForm from './AssignOwnerForm'

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
  const [assigning, setAssigning] = useState(null)

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (s) => <span className="link-strong">{s.name}</span> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true, className: 'cell-wrap' },
    {
      key: 'owner', label: 'Owner',
      render: (s) => (
        <span className="owner-cell">
          {s.ownerId ? <Link to={`/admin/users/${s.ownerId}`}>{s.ownerName}</Link> : <span className="muted">Unassigned</span>}
          <button type="button" className="icon-btn" onClick={() => setAssigning(s)} aria-label={`Change owner of ${s.name}`} title="Change owner">
            <UserCog size={16} />
          </button>
        </span>
      ),
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
      <Modal open={Boolean(assigning)} onClose={() => setAssigning(null)} title="Store owner">
        {assigning && (
          <AssignOwnerForm
            store={assigning}
            onCancel={() => setAssigning(null)}
            onSaved={() => { setAssigning(null); notify('Store owner updated'); list.reload() }}
          />
        )}
      </Modal>
    </>
  )
}
