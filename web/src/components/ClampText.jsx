import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

/**
 * Clamps text to `lines` lines. When it overflows, shows a "See more" affordance.
 * - If `moreHref` is given, "See more" links there (e.g. a post detail page).
 * - Otherwise it opens the full text in a popup.
 */
export default function ClampText({ text, lines = 3, className = '', moreHref, title = 'Post' }) {
  const ref = useRef(null)
  const [overflowing, setOverflowing] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el) setOverflowing(el.scrollHeight - el.clientHeight > 2)
  }, [text, lines])

  if (!text) return null

  const clampStyle = {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }

  return (
    <>
      <p ref={ref} className={`whitespace-pre-wrap ${className}`} style={clampStyle}>{text}</p>
      {overflowing && (
        moreHref ? (
          <Link to={moreHref} className="inline-block mt-0.5 text-sm font-semibold text-violet-600 hover:underline">
            … See more
          </Link>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
            className="mt-0.5 text-sm font-semibold text-violet-600 hover:underline"
          >
            … See more
          </button>
        )
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{title}</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
