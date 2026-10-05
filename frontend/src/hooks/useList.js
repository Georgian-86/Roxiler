import { useCallback, useEffect, useRef, useState } from 'react'
import api, { parseError } from '../api/client'

/**
 * Server-driven list state (filters, sort, pagination) for a GET endpoint.
 * Filter changes are debounced so typing does not fire a request per keystroke.
 */
export default function useList(url, { initialSort = 'name', initialOrder = 'asc', initialFilters = {}, limit = 10 } = {}) {
  const [filters, setFilters] = useState(initialFilters)
  const [debounced, setDebounced] = useState(initialFilters)
  const [sort, setSort] = useState({ sortBy: initialSort, order: initialOrder })
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ data: [], meta: null, loading: true, error: '' })
  const requestId = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 300)
    return () => clearTimeout(t)
  }, [filters])

  const load = useCallback(async () => {
    const id = ++requestId.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    const params = { ...sort, page, limit }
    for (const [k, v] of Object.entries(debounced)) if (v) params[k] = v
    try {
      const res = await api.get(url, { params })
      if (id !== requestId.current) return
      setState({ data: res.data.data, meta: res.data.meta, loading: false, error: '', raw: res.data })
    } catch (err) {
      if (id !== requestId.current) return
      setState((s) => ({ ...s, loading: false, error: parseError(err).message }))
    }
  }, [url, sort, page, limit, debounced])

  // Data-fetching effect: re-runs whenever the query (filters/sort/page) changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }
  const clearFilters = () => {
    setFilters(initialFilters)
    setPage(1)
  }
  const toggleSort = (key) => {
    setSort((s) => (s.sortBy === key ? { sortBy: key, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: key, order: 'asc' }))
    setPage(1)
  }

  return { ...state, filters, setFilter, clearFilters, sort, toggleSort, page, setPage, reload: load, setState }
}
