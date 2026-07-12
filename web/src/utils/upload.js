export const DEFAULT_UPLOAD_LIMITS = {
  image_max_bytes: 512000,
  video_max_bytes: 2097152,
  audio_max_bytes: 5242880,
}

export function getUploadLimits(config) {
  return { ...DEFAULT_UPLOAD_LIMITS, ...(config?.upload_limits ?? {}) }
}

export function validateFileSize(file, limits = DEFAULT_UPLOAD_LIMITS) {
  const isVideo = file.type?.startsWith('video/')
  const isImage = file.type?.startsWith('image/')
  const isAudio = file.type?.startsWith('audio/')

  if (!isVideo && !isImage && !isAudio) {
    throw new Error('Only image, video and audio files are allowed')
  }

  if (isVideo && file.size > limits.video_max_bytes) {
    throw new Error('Video must be under 2MB')
  }
  if (isImage && file.size > limits.image_max_bytes) {
    throw new Error('Image must be under 500KB')
  }
  if (isAudio && file.size > (limits.audio_max_bytes ?? DEFAULT_UPLOAD_LIMITS.audio_max_bytes)) {
    throw new Error('Audio must be under 5MB')
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
