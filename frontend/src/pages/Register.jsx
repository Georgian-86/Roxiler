import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import AuthLayout from './AuthLayout'
import FormField from '../components/FormField'
import useForm from '../hooks/useForm'
import { rules } from '../utils/validation'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_HINT } from '../utils/constants'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const form = useForm(
    { name: '', email: '', address: '', password: '' },
    { name: rules.name, email: rules.email, address: rules.address, password: rules.password },
  )

  const onSubmit = form.handleSubmit(async (values) => {
    await register({ ...values, name: values.name.trim(), email: values.email.trim(), address: values.address.trim() })
    navigate('/stores', { replace: true })
  })

  return (
    <AuthLayout title="Create your account" subtitle="Sign up to start rating stores.">
      <form onSubmit={onSubmit} noValidate className="form">
        {form.formError && <div className="alert alert-error" role="alert">{form.formError}</div>}
        <FormField label="Full name" autoComplete="name" hint="20–60 characters." maxLength={60} {...form.bind('name')} />
        <FormField label="Email" type="email" autoComplete="email" {...form.bind('email')} />
        <FormField label="Address" as="textarea" autoComplete="street-address" maxLength={400} {...form.bind('address')} />
        <FormField label="Password" type="password" autoComplete="new-password" hint={PASSWORD_HINT} maxLength={16} {...form.bind('password')} />
        <button type="submit" className="btn btn-primary btn-block" disabled={form.submitting}>
          <UserPlus size={18} aria-hidden /> {form.submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  )
}
