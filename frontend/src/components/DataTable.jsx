import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

/**
 * Sortable table. `columns`: [{ key, label, sortable, render, className }].
 * Sorting is server-side; the header only reports which key was clicked.
 */
export default function DataTable({ columns, rows, sort, onSort, loading, empty = 'No records found', rowKey = 'id', caption }) {
  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.sortBy === col.key
              const ariaSort = active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'
              return (
                <th key={col.key} scope="col" aria-sort={col.sortable ? ariaSort : undefined} className={col.className}>
                  {col.sortable ? (
                    <button type="button" className={`th-sort${active ? ' active' : ''}`} onClick={() => onSort(col.key)}>
                      {col.label}
                      {active ? (
                        sort.order === 'asc' ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />
                      ) : (
                        <ArrowUpDown size={14} aria-hidden className="th-sort-idle" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody aria-busy={loading}>
          {loading && rows.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((c) => (
                  <td key={c.key}><span className="skeleton" /></td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]} className={loading ? 'row-stale' : undefined}>
                {columns.map((col) => (
                  <td key={col.key} data-label={col.label} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
