import axios from 'axios'

const TOKEN_KEY = 'storerate.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401 && !error.config?.url?.includes('/auth/login')) onUnauthorized()
    return Promise.reject(error)
  },
)

/** Normalises an axios error into { message, fields }. */
export function parseError(error) {
  const data = error?.response?.data
  return {
    message: data?.message || (error?.response ? 'Something went wrong' : 'Unable to reach the server'),
    fields: data?.errors || {},
  }
}

export default api
