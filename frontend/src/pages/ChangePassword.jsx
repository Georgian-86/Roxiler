import { KeyRound } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import FormField from '../components/FormField'
import useForm from '../hooks/useForm'
import { rules } from '../utils/validation'
import api, { tokenStore } from '../api/client'
import { useToast } from '../context/ToastContext'
import { PASSWORD_HINT } from '../utils/constants'

export default function ChangePassword() {
  const notify = useToast()
  const form = useForm(
    { currentPassword: '', newPassword: '', confirmPassword: '' },
    {
      currentPassword: rules.required('Current password'),
      newPassword: rules.password,
      confirmPassword: (v, all) => (v === all.newPassword ? '' : 'Passwords do not match'),
    },
  )

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    const res = await api.patch('/auth/password', { currentPassword, newPassword })
    tokenStore.set(res.data.token)
    form.reset()
    notify('Password updated successfully')
  })

  return (
    <>
      <PageHeader title="Change password" subtitle="Use a strong password you don't use elsewhere." />
      <div className="card card-narrow">
        <form onSubmit={onSubmit} noValidate className="form">
          {form.formError && <div className="alert alert-error" role="alert">{form.formError}</div>}
          <FormField label="Current password" type="password" autoComplete="current-password" {...form.bind('currentPassword')} />
          <FormField label="New password" type="password" autoComplete="new-password" hint={PASSWORD_HINT} maxLength={16} {...form.bind('newPassword')} />
          <FormField label="Confirm new password" type="password" autoComplete="new-password" maxLength={16} {...form.bind('confirmPassword')} />
          <button type="submit" className="btn btn-primary" disabled={form.submitting}>
            <KeyRound size={18} aria-hidden /> {form.submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </>
  )
}
