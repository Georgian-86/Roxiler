import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function FormField({ label, error, hint, type = 'text', as, maxLength, children, ...props }) {
  const id = useId()
  const [reveal, setReveal] = useState(false)
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const inputType = type === 'password' && reveal ? 'text' : type
  const common = {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    className: `input${error ? ' input-error' : ''}`,
    maxLength,
    ...props,
  }
  const length = typeof props.value === 'string' ? props.value.length : 0

  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id} className="label">{label}</label>
        {maxLength && as === 'textarea' && (
          <span className="field-count" aria-hidden>{length}/{maxLength}</span>
        )}
      </div>
      {as === 'textarea' ? (
        <textarea rows={3} {...common} />
      ) : as === 'select' ? (
        <select {...common}>{children}</select>
      ) : (
        <div className="input-wrap">
          <input type={inputType} {...common} />
          {type === 'password' && (
            <button
              type="button"
              className="input-adornment"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
}
