import { useState } from 'react'
import api, { parseError } from '../../api/client'
import { StarInput } from '../../components/StarRating'
import { useToast } from '../../context/ToastContext'

/** Pick stars, then explicitly submit (new) or update (existing) the rating. */
export default function RateCell({ store, onRated }) {
  const [pending, setPending] = useState(store.myRating || 0)
  const [saving, setSaving] = useState(false)
  const notify = useToast()
  const dirty = pending && pending !== store.myRating
  const isUpdate = Boolean(store.myRating)

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/stores/${store.id}/rating`, { rating: pending })
      onRated(store.id, res.data)
      notify(isUpdate ? `Rating for ${store.name} updated` : `Thanks for rating ${store.name}!`)
    } catch (err) {
      notify(parseError(err).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rate-cell">
      <StarInput value={pending} onChange={setPending} disabled={saving} label={`Rate ${store.name}`} />
      {dirty ? (
        <div className="rate-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isUpdate ? 'Update' : 'Submit'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPending(store.myRating || 0)} disabled={saving}>
            Cancel
          </button>
        </div>
      ) : (
        <span className="muted rate-hint">{isUpdate ? 'Click stars to modify' : 'Click to rate'}</span>
      )}
    </div>
  )
}
