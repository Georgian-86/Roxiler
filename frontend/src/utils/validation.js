// Mirrors the backend rules in backend/src/validators/fields.js.
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const rules = {
  name(value) {
    const v = (value || '').trim()
    if (!v) return 'Name is required'
    if (v.length < 20 || v.length > 60) return 'Name must be between 20 and 60 characters'
    return ''
  },
  email(value) {
    const v = (value || '').trim()
    if (!v) return 'Email is required'
    if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address'
    return ''
  },
  address(value) {
    const v = (value || '').trim()
    if (!v) return 'Address is required'
    if (v.length > 400) return 'Address must be at most 400 characters'
    return ''
  },
  password(value) {
    if (!value) return 'Password is required'
    if (!PASSWORD_REGEX.test(value)) {
      return 'Password must be 8-16 characters with at least one uppercase letter and one special character'
    }
    return ''
  },
  required(label) {
    return (value) => ((value ?? '').toString().trim() ? '' : `${label} is required`)
  },
}

/** Runs a { field: validator } map and returns only the failing fields. */
export function validate(values, schema) {
  const errors = {}
  for (const [field, check] of Object.entries(schema)) {
    const msg = check(values[field], values)
    if (msg) errors[field] = msg
  }
  return errors
}
