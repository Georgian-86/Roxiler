import { useState } from 'react'
import { validate } from '../utils/validation'
import { parseError } from '../api/client'

/**
 * Small form helper: tracks values, validates on blur/submit with the shared
 * rules, and maps server-side field errors back onto inputs.
 */
export default function useForm(initial, schema) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const check = (field, nextValues) => {
    if (!schema[field]) return
    const msg = schema[field](nextValues[field], nextValues)
    setErrors((e) => ({ ...e, [field]: msg }))
  }

  const bind = (field) => ({
    name: field,
    value: values[field] ?? '',
    onChange: (e) => {
      const next = { ...values, [field]: e.target.value }
      setValues(next)
      if (touched[field]) check(field, next)
    },
    onBlur: () => {
      setTouched((t) => ({ ...t, [field]: true }))
      check(field, values)
    },
    error: errors[field],
  })

  const handleSubmit = (onValid) => async (e) => {
    e.preventDefault()
    setFormError('')
    const found = validate(values, schema)
    setErrors(found)
    setTouched(Object.fromEntries(Object.keys(schema).map((k) => [k, true])))
    if (Object.keys(found).length) return
    setSubmitting(true)
    try {
      await onValid(values)
    } catch (err) {
      const { message, fields } = parseError(err)
      if (Object.keys(fields).length) setErrors(fields)
      else setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setValues(initial)
    setErrors({})
    setTouched({})
    setFormError('')
  }

  return { values, setValues, errors, bind, handleSubmit, submitting, formError, reset }
}
