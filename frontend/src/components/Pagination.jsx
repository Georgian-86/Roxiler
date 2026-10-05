import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null
  const { page, totalPages, total, limit } = meta
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">Showing {from}–{to} of {total}</span>
      <div className="pagination-controls">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="pagination-page">Page {page} of {totalPages}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
