import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { setUnauthorizedHandler, tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()))

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  const establish = useCallback(({ token, user: u }) => {
    tokenStore.set(token)
    setUser(u)
    return u
  }, [])

  const login = useCallback(
    async (email, password) => establish((await api.post('/auth/login', { email, password })).data),
    [establish],
  )
  const register = useCallback(
    async (payload) => establish((await api.post('/auth/register', payload)).data),
    [establish],
  )

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
