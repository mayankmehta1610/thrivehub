import { useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Eye } from 'lucide-react'
import RichText from './RichText'

/**
 * A multiline text editor with a Markdown formatting toolbar and a live preview toggle.
 * Emits Markdown text via onChange(value).
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Write a description…', rows = 5 }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(false)

  const apply = (kind) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = value || ''
    const selected = text.slice(start, end)

    let insert = selected
    let caret = null
    if (kind === 'bold') insert = `**${selected || 'bold text'}**`
    else if (kind === 'italic') insert = `_${selected || 'italic text'}_`
    else if (kind === 'link') insert = `[${selected || 'link text'}](https://)`
    else if (kind === 'bullet') {
      insert = (selected || 'List item').split('\n').map((l) => `- ${l}`).join('\n')
    } else if (kind === 'numbered') {
      insert = (selected || 'List item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n')
    }

    const next = text.slice(0, start) + insert + text.slice(end)
    onChange(next)
    // restore focus + a reasonable caret position
    requestAnimationFrame(() => {
      el.focus()
      const pos = caret ?? start + insert.length
      el.setSelectionRange(pos, pos)
    })
  }

  const Btn = ({ onClick, title, children }) => (
    <button type="button" onClick={onClick} title={title}
      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
      {children}
    </button>
  )

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-slate-100 bg-slate-50">
        <Btn onClick={() => apply('bold')} title="Bold"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => apply('italic')} title="Italic"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => apply('bullet')} title="Bullet list"><List className="w-4 h-4" /></Btn>
        <Btn onClick={() => apply('numbered')} title="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
        <Btn onClick={() => apply('link')} title="Link"><LinkIcon className="w-4 h-4" /></Btn>
        <button type="button" onClick={() => setPreview((p) => !p)} title="Toggle preview"
          className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${preview ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}>
          <Eye className="w-3.5 h-3.5" /> {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="px-4 py-3 min-h-[7rem] text-slate-700 text-sm">
          {value?.trim() ? <RichText text={value} /> : <span className="text-slate-400">Nothing to preview yet.</span>}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 text-sm resize-y focus:outline-none"
        />
      )}
      <p className="px-3 py-1 text-[11px] text-slate-400 border-t border-slate-100 bg-slate-50">
        Formatting: **bold**, _italic_, - lists, [links](url)
      </p>
    </div>
  )
}
