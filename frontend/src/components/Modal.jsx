import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/** Native <dialog> based modal: focus trapping and Esc handling come for free. */
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="modal-body">
          <header className="modal-header">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
