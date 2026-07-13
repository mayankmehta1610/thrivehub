/**
 * Renders a small, safe subset of Markdown as React elements.
 * Supports: **bold**, *italic* / _italic_, [text](url) links, - / * bullet lists,
 * 1. numbered lists, and paragraphs / line breaks. No raw HTML is ever injected.
 */
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/
const BOLD_RE = /\*\*([^*]+)\*\*/
const ITALIC_RE = /(?:\*|_)([^*_\n]+)(?:\*|_)/

function parseInline(text, keyBase = 'i') {
  const nodes = []
  let remaining = text
  let k = 0
  while (remaining) {
    const candidates = [
      { re: LINK_RE, kind: 'link' },
      { re: BOLD_RE, kind: 'bold' },
      { re: ITALIC_RE, kind: 'italic' },
    ]
    let best = null
    for (const c of candidates) {
      const m = c.re.exec(remaining)
      if (m && (!best || m.index < best.m.index)) best = { ...c, m }
    }
    if (!best) {
      nodes.push(remaining)
      break
    }
    if (best.m.index > 0) nodes.push(remaining.slice(0, best.m.index))
    const key = `${keyBase}-${k++}`
    if (best.kind === 'link') {
      nodes.push(
        <a key={key} href={best.m[2]} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline break-words">{best.m[1]}</a>,
      )
    } else if (best.kind === 'bold') {
      nodes.push(<strong key={key}>{best.m[1]}</strong>)
    } else {
      nodes.push(<em key={key}>{best.m[1]}</em>)
    }
    remaining = remaining.slice(best.m.index + best.m[0].length)
  }
  return nodes
}

/** Strip markdown markers for a clean, unformatted preview (e.g. clamped feed text). */
export function stripMarkdown(text) {
  if (!text) return ''
  return String(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?:\*|_)([^*_\n]+)(?:\*|_)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
}

export default function RichText({ text, className = '' }) {
  if (!text || !String(text).trim()) return null
  const blocks = String(text).replace(/\r\n/g, '\n').split(/\n{2,}/)

  return (
    <div className={`rich-text space-y-3 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const isBullet = lines.every((l) => /^\s*[-*]\s+/.test(l))
        const isNumbered = lines.every((l) => /^\s*\d+\.\s+/.test(l))
        if (isBullet) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1">
              {lines.map((l, li) => <li key={li}>{parseInline(l.replace(/^\s*[-*]\s+/, ''), `${bi}-${li}`)}</li>)}
            </ul>
          )
        }
        if (isNumbered) {
          return (
            <ol key={bi} className="list-decimal pl-5 space-y-1">
              {lines.map((l, li) => <li key={li}>{parseInline(l.replace(/^\s*\d+\.\s+/, ''), `${bi}-${li}`)}</li>)}
            </ol>
          )
        }
        return (
          <p key={bi} className="leading-relaxed">
            {lines.map((l, li) => (
              <span key={li}>
                {parseInline(l, `${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
