import { DEFAULT_UPLOAD_LIMITS, validateFileSize } from '../utils/upload'

export const WAKE_TIMEOUT_MS = 90000
export const PRODUCTION_API_BASE = 'https://thrivehub-api.onrender.com/api/v1'
export const PRODUCTION_HEALTH_URL = 'https://thrivehub-api.onrender.com/health'

export const NETWORK_ERROR =
  'Server unreachable. It may be waking up (free tier) — wait a moment and try again.'

export function formatAuthError(err) {
  if (err instanceof NetworkError) return NETWORK_ERROR
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Wrong email or password.'
    if (err.status === 404) return 'Account not found.'
    if (err.status >= 500) return 'Server error. Please try again in a moment.'
    return err.message
  }
  return err?.message || 'Login failed.'
}

const MAX_RETRIES = 6

export class NetworkError extends Error {
  constructor(message = NETWORK_ERROR) {
    super(message)
    this.name = 'NetworkError'
    this.isNetwork = true
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isLocalDev() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

/** Always use direct production API URL — never relative /api/v1 on deployed web. */
function getApiBase() {
  if (isLocalDev()) return import.meta.env.VITE_API_URL || '/api/v1'
  return import.meta.env.VITE_API_URL || PRODUCTION_API_BASE
}

function getHealthUrl() {
  const base = getApiBase()
  if (base.startsWith('http')) return base.replace(/\/api\/v1\/?$/, '') + '/health'
  return PRODUCTION_HEALTH_URL
}

async function fetchWithTimeout(url, ms = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function isHealthyResponse(res) {
  if (!res.ok) return false
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return false
  try {
    const data = await res.json()
    return data?.status === 'ok'
  } catch {
    return false
  }
}

function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    err?.name === 'AbortError' ||
    err?.message === 'Failed to fetch' ||
    err instanceof NetworkError
  )
}

function backoffMs(attempt) {
  return Math.min(1500 * 2 ** attempt, 15000)
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastError
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      lastError = err
      if (!isNetworkError(err) || attempt === retries - 1) throw err
      await new Promise((r) => setTimeout(r, backoffMs(attempt)))
    }
  }
  throw lastError
}

/**
 * Ping GET /health until the API responds or maxWaitMs elapses.
 * Used before login/register and on landing config load (Render free tier cold start).
 */
export async function wakeApi({ onStatus, maxWaitMs = WAKE_TIMEOUT_MS } = {}) {
  const healthUrl = getHealthUrl()
  const start = Date.now()
  let attempt = 0

  while (Date.now() - start < maxWaitMs) {
    attempt += 1
    onStatus?.('Connecting to server...')
    try {
      const res = await fetchWithTimeout(healthUrl)
      if (await isHealthyResponse(res)) return true
    } catch {
      // keep retrying until maxWaitMs
    }

    const elapsed = Date.now() - start
    if (elapsed >= maxWaitMs) break

    const delay = backoffMs(attempt - 1)
    await new Promise((r) => setTimeout(r, Math.min(delay, maxWaitMs - elapsed)))
  }

  return false
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
  }

  setTokens(access, refresh) {
    this.token = access
    this.refreshToken = refresh
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  }

  clearTokens() {
    this.token = null
    this.refreshToken = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const skipRefresh = path === '/auth/login' || path === '/auth/register'

    let res
    try {
      res = await fetchWithRetry(`${getApiBase()}${path}`, { ...options, headers })
    } catch (err) {
      if (isNetworkError(err)) throw new NetworkError()
      throw err
    }

    if (res.status === 401 && this.refreshToken && !skipRefresh) {
      let refreshRes
      try {
        refreshRes = await fetchWithRetry(`${getApiBase()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        })
      } catch (err) {
        if (isNetworkError(err)) throw new NetworkError()
        throw err
      }
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        this.setTokens(data.access_token, data.refresh_token)
        headers.Authorization = `Bearer ${data.access_token}`
        res = await fetchWithRetry(`${getApiBase()}${path}`, { ...options, headers })
      } else {
        this.clearTokens()
        throw new ApiError('Session expired', 401)
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiError(err.detail || `Request failed: ${res.status}`, res.status)
    }
    if (res.status === 204) return null
    return res.json()
  }

  get(path, params = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v)
    })
    const query = qs.toString()
    return this.request(`${path}${query ? `?${query}` : ''}`)
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) })
  }

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body: JSON.stringify(body) })
  }

  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' })
  }

  // Auth — always wake API before auth requests
  async login(email, password) {
    this.clearTokens()
    const awake = await wakeApi()
    if (!awake) throw new NetworkError()
    return this.post('/auth/login', { email, password })
  }

  async register(data) {
    this.clearTokens()
    const awake = await wakeApi()
    if (!awake) throw new NetworkError()
    return this.post('/auth/register', data)
  }

  getMe() {
    return this.get('/auth/me')
  }

  // Config
  getConfig() {
    return this.get('/config')
  }

  // Feed & Posts
  getFeed(params) {
    return this.get('/feed', params)
  }

  getPosts(params) {
    return this.get('/posts', params)
  }

  createPost(data) {
    return this.post('/posts', data)
  }

  getPost(postId) {
    return this.get(`/posts/${postId}`)
  }

  updatePost(postId, data) {
    return this.patch(`/posts/${postId}`, data)
  }

  getPostComments(postId, params) {
    return this.get(`/posts/${postId}/comments`, params)
  }

  createComment(postId, body) {
    return this.post(`/posts/${postId}/comments`, { body })
  }

  reactPost(postId, reaction_type = 'like') {
    return this.post(`/posts/${postId}/reactions`, { reaction_type })
  }

  unreactPost(postId) {
    return this.delete(`/posts/${postId}/reactions`)
  }

  getPostReactions(postId, params) {
    return this.get(`/posts/${postId}/reactions`, params)
  }

  sharePost(postId) {
    return this.post(`/posts/${postId}/share`)
  }

  getPostShares(postId, params) {
    return this.get(`/posts/${postId}/shares`, params)
  }

  getPostCommentUsers(postId, params) {
    return this.get(`/posts/${postId}/comments/users`, params)
  }

  // Profiles
  getProfiles(params) {
    return this.get('/profiles', params)
  }

  getProfile(username) {
    return this.get(`/profiles/${username}`)
  }

  getProfileSkills(username) {
    return this.get(`/profiles/${username}/skills`)
  }

  getProfilePhotos(username) {
    return this.get(`/profiles/${username}/photos`)
  }

  addProfilePhoto(data) {
    return this.post('/profiles/me/photos', data)
  }

  deleteProfilePhoto(photoId) {
    return this.delete(`/profiles/me/photos/${photoId}`)
  }

  getUserPosts(authorId, params = {}) {
    return this.get('/posts', { author_id: authorId, ...params })
  }

  updateProfile(data) {
    return this.patch('/profiles/me', data)
  }

  followUser(username) {
    return this.post(`/profiles/${username}/follow`)
  }

  unfollowUser(username) {
    return this.delete(`/profiles/${username}/follow`)
  }

  // Communities
  getCommunities(params) {
    return this.get('/communities', params)
  }

  getCommunity(slug) {
    return this.get(`/communities/${slug}`)
  }

  createCommunity(data) {
    return this.post('/communities', data)
  }

  joinCommunity(slug) {
    return this.post(`/communities/${slug}/join`)
  }

  // Events
  getEvents(params) {
    return this.get('/events', params)
  }

  getEvent(id) {
    return this.get(`/events/${id}`)
  }

  createEvent(data) {
    return this.post('/events', data)
  }

  registerEvent(id) {
    return this.post(`/events/${id}/register`)
  }

  // Messages
  getConversations(params) {
    return this.get('/messages/conversations', params)
  }

  getMessages(conversationId, params) {
    return this.get(`/messages/conversations/${conversationId}/messages`, params)
  }

  sendMessage(conversationId, body) {
    return this.post(`/messages/conversations/${conversationId}/messages`, { body })
  }

  createConversation(data) {
    return this.post('/messages/conversations', data)
  }

  // Start (or reuse) a direct conversation with a user, then return its id.
  async startConversation(userId) {
    const conv = await this.createConversation({ type: 'direct', participant_ids: [userId] })
    return conv
  }

  // Notifications
  getNotifications(params) {
    return this.get('/notifications', params)
  }

  markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`)
  }

  markAllNotificationsRead() {
    return this.post('/notifications/read-all')
  }

  // Search
  search(q, params = {}) {
    return this.get('/search', { q, ...params })
  }

  // Masters
  getMasters(type, params) {
    return this.get('/masters', { master_type: type, ...params })
  }

  // Admin
  getAdminMasters(params) {
    return this.get('/admin/masters', params)
  }

  getUsers(params) {
    return this.get('/users', params)
  }

  // Trust & Safety
  createReport(data) {
    return this.post('/reports', data)
  }

  blockUser(userId) {
    return this.post(`/trust/users/${userId}/block`)
  }

  unblockUser(userId) {
    return this.delete(`/trust/users/${userId}/block`)
  }

  muteUser(userId) {
    return this.post(`/trust/users/${userId}/mute`)
  }

  unmuteUser(userId) {
    return this.delete(`/trust/users/${userId}/mute`)
  }

  createAppeal(reportId, data) {
    return this.post(`/trust/reports/${reportId}/appeals`, data)
  }

  // Admin Moderation
  getModerationQueue(params) {
    return this.get('/admin/moderation/queue', params)
  }

  getReports(params) {
    return this.get('/admin/moderation/reports', params)
  }

  resolveReport(id, data) {
    return this.patch(`/admin/moderation/reports/${id}`, data)
  }

  getAppeals(params) {
    return this.get('/admin/moderation/appeals', params)
  }

  reviewAppeal(id, data) {
    return this.patch(`/admin/moderation/appeals/${id}`, data)
  }

  getAiFlags(params) {
    return this.get('/admin/moderation/ai-flags', params)
  }

  reviewAiFlag(id, data) {
    return this.patch(`/admin/moderation/ai-flags/${id}`, data)
  }

  getAuditLogs(params) {
    return this.get('/admin/moderation/audit-logs', params)
  }

  // Commercial
  getSubscriptionTiers(params) {
    return this.get('/subscriptions/tiers', params)
  }

  getMySubscription() {
    return this.get('/subscriptions/me')
  }

  getSponsorships(params) {
    return this.get('/sponsorships', params)
  }

  // Media
  async uploadMedia(file, limits = DEFAULT_UPLOAD_LIMITS) {
    validateFileSize(file, limits)
    const form = new FormData()
    form.append('file', file)
    const headers = {}
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    let res
    try {
      res = await fetchWithRetry(`${getApiBase()}/media/upload`, { method: 'POST', headers, body: form })
    } catch (err) {
      if (isNetworkError(err)) throw new NetworkError()
      throw err
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiError(err.detail || 'Upload failed', res.status)
    }
    return res.json()
  }

  // Push
  registerDevice(platform, token) {
    return this.post('/push/register', { platform, token })
  }

  getPushSetup() {
    return this.get('/push/setup')
  }

  // WebSocket URL for messaging
  getWsUrl(conversationId) {
    const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/^http/, 'ws')
    return `${wsBase}/ws/messages/${conversationId}?token=${this.token}`
  }
}

export const api = new ApiClient()
export default api
