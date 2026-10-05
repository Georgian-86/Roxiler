import { useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import useForm from '../../hooks/useForm'
import { rules } from '../../utils/validation'
import api from '../../api/client'

export default function StoreForm({ onCreated, onCancel }) {
  const [owners, setOwners] = useState([])
  const form = useForm(
    { name: '', email: '', address: '', ownerId: '' },
    { name: rules.name, email: rules.email, address: rules.address },
  )

  useEffect(() => {
    api.get('/admin/owners/available').then((r) => setOwners(r.data.data)).catch(() => setOwners([]))
  }, [])

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await api.post('/admin/stores', {
      name: values.name.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      ownerId: values.ownerId ? Number(values.ownerId) : undefined,
    })
    onCreated(res.data.store)
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      {form.formError && <div className="alert alert-error" role="alert">{form.formError}</div>}
      <FormField label="Store name" hint="20–60 characters." maxLength={60} {...form.bind('name')} />
      <FormField label="Store email" type="email" {...form.bind('email')} />
      <FormField label="Address" as="textarea" maxLength={400} {...form.bind('address')} />
      <FormField
        label="Store owner (optional)"
        as="select"
        hint={owners.length ? 'Only owners without a store are listed.' : 'No unassigned store owners. Create a user with the Store Owner role first.'}
        {...form.bind('ownerId')}
      >
        <option value="">No owner</option>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={form.submitting}>
          {form.submitting ? 'Creating…' : 'Create store'}
        </button>
      </div>
    </form>
  )
}
