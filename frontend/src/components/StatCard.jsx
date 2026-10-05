export default function StatCard({ icon: Icon, label, value, tone = 'primary' }) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon tone-${tone}`} aria-hidden><Icon size={22} /></span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value ?? '—'}</p>
      </div>
    </div>
  )
}
