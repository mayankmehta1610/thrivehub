import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { DEFAULT_PLACEHOLDER, isValidImageUrl } from '../utils/images'

export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallback = DEFAULT_PLACEHOLDER,
  hideOnError = false,
  iconClassName = 'w-8 h-8 text-white/70',
}) {
  const fallbackUrl = fallback || DEFAULT_PLACEHOLDER
  const [failed, setFailed] = useState(false)
  const [url, setUrl] = useState(() => (isValidImageUrl(src) ? src : fallbackUrl))

  useEffect(() => {
    setFailed(false)
    setUrl(isValidImageUrl(src) ? src : fallbackUrl)
  }, [src, fallbackUrl])

  if (hideOnError && (!isValidImageUrl(src) || failed)) {
    return null
  }

  if (failed) {
    return (
      <div
        className={`image-placeholder ${className}`}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <ImageIcon className={iconClassName} aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (url !== fallbackUrl && isValidImageUrl(fallbackUrl)) {
          setUrl(fallbackUrl)
          return
        }
        setFailed(true)
      }}
    />
  )
}
