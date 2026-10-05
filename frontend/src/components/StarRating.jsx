import { useState } from 'react'
import { Star } from 'lucide-react'

/** Read-only star display with a numeric value. */
export function RatingBadge({ value, count }) {
  if (value === null || value === undefined) return <span className="muted">No ratings yet</span>
  return (
    <span className="rating-badge" aria-label={`Rated ${value} out of 5`}>
      <Star size={16} className="star-filled" aria-hidden />
      <strong>{Number(value).toFixed(1)}</strong>
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  )
}

/** Accessible 1-5 star input implemented as a radio group. */
export function StarInput({ value, onChange, disabled, label = 'Your rating', size = 22 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0
  const name = `rating-${label.replace(/\W+/g, '-')}`

  return (
    <div className="star-input" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="star-option" onMouseEnter={() => !disabled && setHover(n)}>
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            disabled={disabled}
            onChange={() => onChange(n)}
            className="sr-only"
          />
          <Star size={size} className={n <= shown ? 'star-filled' : 'star-empty'} aria-hidden />
          <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
        </label>
      ))}
    </div>
  )
}

/** Non-interactive row of five stars. */
export function StarDisplay({ value, size = 16 }) {
  return (
    <span className="star-display" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? 'star-filled' : 'star-empty'} aria-hidden />
      ))}
    </span>
  )
}
