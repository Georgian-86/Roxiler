import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HOME_BY_ROLE } from '../utils/constants'
import { LogIn } from 'lucide-react'
import AuthLayout from './AuthLayout'
import FormField from '../components/FormField'
import useForm from '../hooks/useForm'
import { rules } from '../utils/validation'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm({ email: '', password: '' }, { email: rules.email, password: rules.required('Password') })

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const user = await login(email.trim(), password)
    const from = location.state?.from?.pathname
    navigate(from && from !== '/' ? from : HOME_BY_ROLE[user.role], { replace: true })
  })

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue to your dashboard.">
      <form onSubmit={onSubmit} noValidate className="form">
        {form.formError && <div className="alert alert-error" role="alert">{form.formError}</div>}
        <FormField label="Email" type="email" autoComplete="email" {...form.bind('email')} />
        <FormField label="Password" type="password" autoComplete="current-password" {...form.bind('password')} />
        <button type="submit" className="btn btn-primary btn-block" disabled={form.submitting}>
          <LogIn size={18} aria-hidden /> {form.submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  )
}
