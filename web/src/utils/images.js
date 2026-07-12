export const DEFAULT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&auto=format&fit=crop'

export function isValidImageUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
}

export function isVideoUrl(url) {
  if (typeof url !== 'string') return false
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url.trim())
}

export function filterValidImages(items, urlKey = 'url') {
  if (!Array.isArray(items)) return []
  return items.filter((item) => isValidImageUrl(item?.[urlKey]))
}
