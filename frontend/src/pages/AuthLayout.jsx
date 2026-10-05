import { Star, ShieldCheck, Store } from 'lucide-react'
import { Brand } from '../components/Layout'

const YEAR = new Date().getFullYear()

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-aside" aria-hidden>
        <Brand />
        <div>
          <h2>Honest ratings for the stores around you.</h2>
          <ul className="auth-points">
            <li><Store size={18} /> Discover every registered store</li>
            <li><Star size={18} /> Rate from 1 to 5 and update anytime</li>
            <li><ShieldCheck size={18} /> One secure login for every role</li>
          </ul>
        </div>
        <p className="auth-aside-foot">© {YEAR} StoreRate</p>
      </section>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-brand"><Brand /></div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
