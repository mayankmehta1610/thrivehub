export const DEFAULT_UPLOAD_LIMITS = {
  image_max_bytes: 512000,
  video_max_bytes: 2097152,
}

export function getUploadLimits(config) {
  return config?.upload_limits ?? DEFAULT_UPLOAD_LIMITS
}

export function validateFileSize(file, limits = DEFAULT_UPLOAD_LIMITS) {
  const isVideo = file.type?.startsWith('video/')
  const isImage = file.type?.startsWith('image/')

  if (!isVideo && !isImage) {
    throw new Error('Only image and video files are allowed')
  }

  const maxBytes = isVideo ? limits.video_max_bytes : limits.image_max_bytes
  if (file.size > maxBytes) {
    throw new Error(isVideo ? 'Video must be under 2MB' : 'Image must be under 500KB')
  }
}

/** Returns an error message if invalid, or null if OK. */
export function getFileSizeError(file, limits = DEFAULT_UPLOAD_LIMITS) {
  try {
    validateFileSize(file, limits)
    return null
  } catch (err) {
    return err.message
  }
}
