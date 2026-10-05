import { describe, it, expect } from 'vitest'
import { rules, validate } from './validation'

describe('validation rules', () => {
  it('enforces name length 20-60', () => {
    expect(rules.name('a'.repeat(19))).toBeTruthy()
    expect(rules.name('a'.repeat(20))).toBe('')
    expect(rules.name('a'.repeat(60))).toBe('')
    expect(rules.name('a'.repeat(61))).toBeTruthy()
  })

  it('enforces address max 400', () => {
    expect(rules.address('a'.repeat(400))).toBe('')
    expect(rules.address('a'.repeat(401))).toBeTruthy()
    expect(rules.address('')).toBeTruthy()
  })

  it('enforces password policy', () => {
    expect(rules.password('Abcdef@1')).toBe('')
    expect(rules.password('abcdef@1')).toBeTruthy()
    expect(rules.password('Abcdefg1')).toBeTruthy()
    expect(rules.password('Ab@1')).toBeTruthy()
    expect(rules.password('Abcdefghijklmno@1')).toBeTruthy()
  })

  it('validates email', () => {
    expect(rules.email('a@b.co')).toBe('')
    expect(rules.email('a@b')).toBeTruthy()
    expect(rules.email('not an email')).toBeTruthy()
  })

  it('collects failing fields', () => {
    expect(validate({ name: 'x', email: 'a@b.co' }, { name: rules.name, email: rules.email })).toEqual({
      name: expect.any(String),
    })
  })
})
