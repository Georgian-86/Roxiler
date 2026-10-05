import { useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import api, { parseError } from '../../api/client'

export default function AssignOwnerForm({ store, onSaved, onCancel }) {
  const [owners, setOwners] = useState([])
  const [ownerId, setOwnerId] = useState(store.ownerId ? String(store.ownerId) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/owners/available').then((r) => setOwners(r.data.data)).catch(() => setOwners([]))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.patch(`/admin/stores/${store.id}/owner`, { ownerId: ownerId ? Number(ownerId) : null })
      onSaved(res.data.store)
    } catch (err) {
      const { message, fields } = parseError(err)
      setError(fields.ownerId || message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <p className="muted">Choose who manages <strong>{store.name}</strong>.</p>
      <FormField label="Store owner" as="select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} error={error}
        hint="Only owners without a store are listed.">
        <option value="">No owner</option>
        {store.ownerId && <option value={store.ownerId}>{store.ownerName} (current)</option>}
        {owners.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save owner'}</button>
      </div>
    </form>
  )
}
