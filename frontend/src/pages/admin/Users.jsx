import { Link, useSearchParams } from 'react-router-dom'
import { UserPlus, ChevronRight } from 'lucide-react'
import useList from '../../hooks/useList'
import { PageHeader } from '../../components/Layout'
import DataTable from '../../components/DataTable'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import RoleBadge from '../../components/RoleBadge'
import { ROLE_OPTIONS } from '../../utils/constants'
import { RatingBadge } from '../../components/StarRating'
import { useToast } from '../../context/ToastContext'
import UserForm from './UserForm'

const FILTERS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'role', label: 'Role', options: ROLE_OPTIONS },
]

export default function Users() {
  const list = useList('/admin/users', { initialFilters: { name: '', email: '', address: '', role: '' } })
  const [params, setParams] = useSearchParams()
  const notify = useToast()
  const open = params.get('new') === '1'
  const close = () => setParams({}, { replace: true })

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (u) => <Link to={`/admin/users/${u.id}`} className="link-strong">{u.name}</Link> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'address', label: 'Address', sortable: true, className: 'cell-wrap' },
    { key: 'role', label: 'Role', sortable: true, render: (u) => <RoleBadge role={u.role} /> },
    { key: 'rating', label: 'Rating', sortable: true, render: (u) => (u.role === 'OWNER' ? <RatingBadge value={u.rating} /> : <span className="muted">—</span>) },
    {
      key: 'view', label: <span className="sr-only">Actions</span>,
      render: (u) => <Link to={`/admin/users/${u.id}`} className="icon-btn" aria-label={`View ${u.name}`}><ChevronRight size={18} /></Link>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="All admins, normal users and store owners."
        actions={<button type="button" className="btn btn-primary" onClick={() => setParams({ new: '1' })}><UserPlus size={18} aria-hidden /> Add user</button>}
      />
      <div className="card card-flush">
        <FilterBar fields={FILTERS} filters={list.filters} onChange={list.setFilter} onClear={list.clearFilters} />
        {list.error && <div className="alert alert-error" role="alert">{list.error}</div>}
        <DataTable caption="Users" columns={columns} rows={list.data} sort={list.sort} onSort={list.toggleSort} loading={list.loading} empty="No users match these filters." />
        <Pagination meta={list.meta} onPage={list.setPage} />
      </div>
      <Modal open={open} onClose={close} title="Add user">
        <UserForm
          onCancel={close}
          onCreated={(u) => { close(); notify(`${u.name} was added`); list.reload() }}
        />
      </Modal>
    </>
  )
}
