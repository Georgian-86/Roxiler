import FormField from '../../components/FormField'
import useForm from '../../hooks/useForm'
import { rules } from '../../utils/validation'
import api from '../../api/client'
import { ROLE_OPTIONS, PASSWORD_HINT } from '../../utils/constants'

export default function UserForm({ onCreated, onCancel }) {
  const form = useForm(
    { name: '', email: '', address: '', password: '', role: 'USER' },
    { name: rules.name, email: rules.email, address: rules.address, password: rules.password, role: rules.required('Role') },
  )

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await api.post('/admin/users', { ...values, name: values.name.trim(), email: values.email.trim(), address: values.address.trim() })
    onCreated(res.data.user)
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      {form.formError && <div className="alert alert-error" role="alert">{form.formError}</div>}
      <FormField label="Full name" hint="20–60 characters." maxLength={60} {...form.bind('name')} />
      <FormField label="Email" type="email" {...form.bind('email')} />
      <FormField label="Address" as="textarea" maxLength={400} {...form.bind('address')} />
      <FormField label="Password" type="password" autoComplete="new-password" hint={PASSWORD_HINT} maxLength={16} {...form.bind('password')} />
      <FormField label="Role" as="select" {...form.bind('role')}>
        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={form.submitting}>
          {form.submitting ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  )
}
