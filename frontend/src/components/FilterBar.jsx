import { Search, X } from 'lucide-react'

/** Row of text/select filters bound to useList's filter state. */
export default function FilterBar({ fields, filters, onChange, onClear }) {
  const active = Object.values(filters).some(Boolean)
  return (
    <div className="filter-bar" role="search">
      {fields.map((f) => (
        <label key={f.key} className="filter">
          <span className="sr-only">{f.label}</span>
          {f.options ? (
            <select className="input" value={filters[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)}>
              <option value="">{f.label}: All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <div className="input-wrap">
              <Search size={16} className="input-icon" aria-hidden />
              <input
                className="input input-with-icon"
                type="search"
                placeholder={f.placeholder || `Filter by ${f.label.toLowerCase()}`}
                value={filters[f.key] || ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            </div>
          )}
        </label>
      ))}
      {active && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <X size={16} /> Clear
        </button>
      )}
    </div>
  )
}
