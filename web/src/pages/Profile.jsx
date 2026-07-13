import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MapPin, Globe, UserPlus, UserMinus, Ban, VolumeX, Flag, Edit,
  BadgeCheck, Camera, X, Users, FileText, MessageCircle,
} from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import ClampText from '../components/ClampText'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'
import { filterValidImages, isValidImageUrl } from '../utils/images'
import { SOCIAL_PROVIDERS } from '../utils/social'
import { getUploadLimits, getFileSizeError } from '../utils/upload'

const SKILL_ICONS = {
  dance: '💃', standup: '🎤', sports: '⚽', football: '⚽', running: '🏃',
  adventure: '🏔️', hiking: '🥾', climbing: '🧗', music: '🎵', art: '🎨',
  fitness: '💪', photography: '📷', cooking: '🍳', coaching: '🏆',
  public_speaking: '🗣️', yoga: '🧘',
}

function skillBadgeClass(code) {
  const key = `skill-badge-${code}`
  const known = [
    'dance', 'standup', 'sports', 'football', 'running', 'adventure',
    'hiking', 'climbing', 'music', 'art', 'fitness', 'photography',
    'cooking', 'coaching', 'public_speaking',
  ]
  return known.includes(code) ? key : 'skill-badge-default'
}

function PhotoLightbox({ photo, onClose }) {
  if (!photo) return null
  return (
    <div className="lightbox-overlay animate-fade-in" onClick={onClose} role="dialog" aria-label="Photo preview">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="text-center">
        <SafeImage src={photo.url} alt={photo.caption || 'Gallery photo'} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        {photo.caption && (
          <p className="mt-3 text-white/90 text-sm max-w-lg mx-auto">{photo.caption}</p>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()
  const requireAuth = useRequireAuth()
  const [config, setConfig] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [following, setFollowing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [muted, setMuted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [connections, setConnections] = useState([])
  const [connBusy, setConnBusy] = useState('')
  const [uploadingField, setUploadingField] = useState('')
  const [postsLoading, setPostsLoading] = useState(true)
  const [uploadError, setUploadError] = useState('')
  const avatarFileRef = useRef(null)
  const coverFileRef = useRef(null)

  useEffect(() => {
    api.getConfig().then((cfg) => {
      setConfig(cfg)
      if (cfg?.primary_color) {
        document.documentElement.style.setProperty('--primary', cfg.primary_color)
      }
      if (cfg?.accent_color) {
        document.documentElement.style.setProperty('--accent', cfg.accent_color)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setProfile(null)
    setPosts([])
    setPostsLoading(true)

    api.getProfile(username).then((p) => {
      setProfile(p)
      setEditForm({
        display_name: p.display_name,
        bio: p.bio || '',
        location: p.location || '',
        website: p.website || '',
        avatar_url: p.avatar_url || '',
        cover_url: p.cover_url || '',
      })
      return api.getUserPosts(p.user_id, { page_size: 20 })
    }).then((data) => {
      setPosts(data?.items || [])
    }).catch(console.error).finally(() => setPostsLoading(false))
  }, [username])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const err = searchParams.get('connect_error')
    if (connected) toast.success(`${connected} connected 🎉`)
    if (err) toast.error(`Could not connect ${err}. Check the app's API credentials.`)
    if (connected || err) {
      searchParams.delete('connected'); searchParams.delete('connect_error')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isOwn = currentUser?.profile?.username === username
  const coverUrl = profile?.cover_url || config?.hero_image
  const avatarUrl = profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'

  const toggleFollow = async () => {
    if (!requireAuth(AUTH_MESSAGES.follow)) return
    if (following) {
      await api.unfollowUser(username)
      setFollowing(false)
    } else {
      await api.followUser(username)
      setFollowing(true)
    }
  }

  const handleBlock = async () => {
    if (!requireAuth(AUTH_MESSAGES.block)) return
    if (!profile?.user_id) return
    if (blocked) {
      await api.unblockUser(profile.user_id)
      setBlocked(false)
    } else {
      await api.blockUser(profile.user_id)
      setBlocked(true)
    }
  }

  const handleMute = async () => {
    if (!requireAuth(AUTH_MESSAGES.mute)) return
    if (!profile?.user_id) return
    if (muted) {
      await api.unmuteUser(profile.user_id)
      setMuted(false)
    } else {
      await api.muteUser(profile.user_id)
      setMuted(true)
    }
  }

  const handleReport = async () => {
    if (!requireAuth(AUTH_MESSAGES.report)) return
    if (!profile?.user_id || !reportReason.trim()) return
    await api.createReport({
      target_type: 'user',
      target_id: profile.user_id,
      description: reportReason,
    })
    setShowReport(false)
    setReportReason('')
    toast.success('Report submitted. Our team will review it.')
  }

  const handleMessage = async () => {
    if (!requireAuth(AUTH_MESSAGES.sendMessage)) return
    if (!profile?.user_id) return
    navigate(`/messages?to=${profile.user_id}`)
  }

  const saveProfile = async () => {
    if (!requireAuth(AUTH_MESSAGES.editProfile)) return
    const updated = await api.updateProfile(editForm)
    setProfile(updated)
    setEditing(false)
    setUploadError('')
  }

  const openEdit = () => {
    if (!requireAuth(AUTH_MESSAGES.editProfile)) return
    setEditing(true)
    api.getSocialConnections().then(setConnections).catch(() => setConnections([]))
  }

  const refreshConnections = async () => setConnections(await api.getSocialConnections())

  const connectLive = async (provider) => {
    setConnBusy(provider)
    try {
      const { authorize_url } = await api.getSocialAuthorizeUrl(provider)
      window.location.href = authorize_url // real OAuth consent screen
    } catch (err) {
      toast.error(err?.message || 'Live connect not available yet')
      setConnBusy('')
    }
  }

  const demoConnect = async (provider) => {
    setConnBusy(provider)
    try {
      await api.connectSocial(provider)
      await refreshConnections()
      toast.success('Demo connection added (preview only)')
    } catch (err) {
      toast.error(err?.message || 'Could not connect')
    } finally {
      setConnBusy('')
    }
  }

  const disconnectConn = async (provider) => {
    setConnBusy(provider)
    try {
      await api.disconnectSocial(provider)
      await refreshConnections()
      toast.success('Disconnected')
    } catch (err) {
      toast.error(err?.message || 'Could not disconnect')
    } finally {
      setConnBusy('')
    }
  }

  const downloadMyData = async () => {
    try {
      const data = await api.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thrivehub-data-${profile?.username || 'me'}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Your data has been downloaded')
    } catch (err) {
      toast.error(err?.message || 'Could not export your data')
    }
  }

  const requestDeletion = async () => {
    if (!window.confirm('Request deletion of your account? Our team will process it — you can keep using ThriveHub until then.')) return
    try {
      const res = await api.requestAccountDeletion()
      toast.success(res?.status === 'already_requested' ? 'You already have a deletion request pending' : 'Deletion request received')
    } catch (err) {
      toast.error(err?.message || 'Could not submit request')
    }
  }

  const handlePhotoUpload = async (file, field) => {
    if (!requireAuth(AUTH_MESSAGES.uploadMedia)) return
    if (!file) return
    const limits = getUploadLimits(config)
    const sizeError = getFileSizeError(file, limits)
    if (sizeError) {
      setUploadError(sizeError)
      return
    }
    setUploadError('')
    setUploadingField(field)
    try {
      const result = await api.uploadMedia(file, limits)
      setEditForm((prev) => ({ ...prev, [field]: result.url }))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingField('')
    }
  }

  const refreshPosts = async () => {
    if (!profile?.user_id) return
    const data = await api.getUserPosts(profile.user_id, { page_size: 20 })
    setPosts(data?.items || [])
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Loading profile…</div>
      </div>
    )
  }

  const skills = profile.skills || []
  const photos = filterValidImages(profile.photos || [], 'url')

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />

      <div className="max-w-3xl mx-auto pb-10">
        {/* Cover photo */}
        <div className="profile-cover">
          {coverUrl ? (
            <SafeImage src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-hero" />
          )}
          <div className="profile-cover-overlay" />
        </div>

        <div className="px-4">
          {/* Header card — name & actions on solid white background */}
          <div className="profile-header-card">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <SafeImage
                src={avatarUrl}
                alt={profile.display_name}
                className="profile-avatar -mt-14 sm:-mt-16 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  {profile.display_name}
                  {profile.is_verified && (
                    <BadgeCheck className="w-5 h-5 text-sky-600" aria-label="Verified" />
                  )}
                </h1>
                <p className="text-slate-500 font-medium">@{profile.username}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    <strong className="text-slate-800">{profile.follower_count ?? 0}</strong> followers
                  </span>
                  <span className="flex items-center gap-1">
                    <strong className="text-slate-800">{profile.following_count ?? 0}</strong> following
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <strong className="text-slate-800">{profile.post_count ?? posts.length}</strong> posts
                  </span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0 self-start sm:self-end">
                {isOwn ? (
                  <button onClick={openEdit} className="btn-edit-profile">
                    <Edit className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={toggleFollow}
                      className={`btn-follow ${following ? 'following' : ''}`}
                    >
                      {following
                        ? <><UserMinus className="w-4 h-4" /> Unfollow</>
                        : <><UserPlus className="w-4 h-4" /> Follow</>}
                    </button>
                    <button onClick={handleMessage} title="Message"
                      className="p-2 rounded-lg border bg-white text-slate-500 border-slate-200 hover:bg-slate-50">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={handleBlock} title="Block"
                      className={`p-2 rounded-lg border ${blocked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                      <Ban className="w-4 h-4" />
                    </button>
                    <button onClick={handleMute} title="Mute"
                      className={`p-2 rounded-lg border ${muted ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                      <VolumeX className="w-4 h-4" />
                    </button>
                    <button onClick={() => requireAuth(AUTH_MESSAGES.report) && setShowReport(true)} title="Report"
                      className="p-2 rounded-lg border bg-white text-slate-500 border-slate-200">
                      <Flag className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio card */}
          <div className="profile-section">
            <h2 className="profile-section-title">About</h2>
            {profile.bio ? (
              <ClampText text={profile.bio} lines={3} className="text-slate-700 leading-relaxed" title="About" />
            ) : (
              <p className="text-slate-400 italic">
                {isOwn ? 'Add a bio to tell your story.' : 'No bio yet.'}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sky-700 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="profile-section">
              <h2 className="profile-section-title">Skills & Interests</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className={`skill-badge ${skillBadgeClass(skill.code)}`}
                  >
                    <span aria-hidden="true">{SKILL_ICONS[skill.code] || '✨'}</span>
                    {skill.label}
                    {skill.level && (
                      <span className="opacity-70 font-normal text-xs">· {skill.level}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Photo gallery */}
          {photos.length > 0 && (
            <div className="profile-section">
              <h2 className="profile-section-title flex items-center gap-2">
                <Camera className="w-5 h-5 text-slate-400" />
                Photos
              </h2>
              <div className="photo-gallery">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="photo-gallery-item"
                    onClick={() => setLightboxPhoto(photo)}
                    aria-label={photo.caption || 'View photo'}
                  >
                    <SafeImage
                      src={photo.url}
                      alt={photo.caption || ''}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="profile-section mt-4">
            <h2 className="profile-section-title">Posts</h2>
            {postsLoading ? (
              <p className="text-slate-400 text-sm">Loading posts…</p>
            ) : posts.length > 0 ? (
              <div className="space-y-4 -mx-1">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onUpdate={refreshPosts} isOwn={isOwn} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>{isOwn ? "You haven't posted yet." : 'No posts yet.'}</p>
                {isOwn && (
                  <Link to="/feed" className="inline-block mt-3 text-sm font-medium text-sky-700 hover:underline">
                    Go to feed to create a post
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

              <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'cover_url')} />
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'avatar_url')} />

              {/* Cover + avatar upload */}
              <div>
                <div className="relative rounded-xl overflow-hidden h-28 bg-slate-100">
                  {isValidImageUrl(editForm.cover_url)
                    ? <SafeImage src={editForm.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full gradient-hero" />}
                  <button type="button" onClick={() => coverFileRef.current?.click()}
                    className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/55 text-white text-xs hover:bg-black/70">
                    <Camera className="w-3.5 h-3.5" /> {uploadingField === 'cover_url' ? 'Uploading…' : 'Change cover'}
                  </button>
                  <div className="absolute -bottom-6 left-4">
                    <div className="relative">
                      <SafeImage src={editForm.avatar_url || avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white bg-slate-200" />
                      <button type="button" onClick={() => avatarFileRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center border-2 border-white hover:bg-violet-700"
                        title="Change avatar">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="h-6" />
                <p className="text-xs text-slate-400">
                  {uploadingField === 'avatar_url' ? 'Uploading avatar…' : 'Tap a camera icon to upload a cover photo or avatar (JPG/PNG, up to 500 KB).'}
                </p>
              </div>

              {/* Text fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Display name</label>
                  <input value={editForm.display_name || ''} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Bio</label>
                  <textarea value={editForm.bio || ''} rows={4} placeholder="Tell your story" onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Location</label>
                  <input value={editForm.location || ''} placeholder="City, Country" onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Website</label>
                  <input value={editForm.website || ''} placeholder="https://…" onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                </div>
              </div>

              {/* Connected accounts */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Connected Accounts</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Publish your posts to these channels too. <strong>Live</strong> connect uses the platform's real
                  sign-in and needs its API keys set on the server; otherwise add a <strong>Demo</strong> connection to preview cross-posting.
                </p>
                <div className="space-y-2">
                  {SOCIAL_PROVIDERS.map(({ code, label, emoji }) => {
                    const conn = connections.find((c) => c.provider === code)
                    const connected = !!conn?.connected
                    const configured = !!conn?.configured
                    const isDemo = conn?.status === 'demo'
                    return (
                      <div key={code} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                          <span aria-hidden="true">{emoji}</span>
                          <span className="truncate">{label}</span>
                          {connected && conn?.external_username && <span className="text-xs text-slate-400 truncate">@{conn.external_username}</span>}
                          {connected && (isDemo
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 shrink-0">Demo</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">Live</span>)}
                        </span>
                        <div className="shrink-0">
                          {connected ? (
                            <button type="button" disabled={connBusy === code} onClick={() => disconnectConn(code)}
                              className="px-3 py-1 rounded-lg text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50">
                              {connBusy === code ? '…' : 'Disconnect'}
                            </button>
                          ) : configured ? (
                            <button type="button" disabled={connBusy === code} onClick={() => connectLive(code)}
                              className="px-3 py-1 rounded-lg text-xs font-medium border bg-violet-600 text-white border-violet-600 hover:bg-violet-700 disabled:opacity-50">
                              {connBusy === code ? '…' : 'Connect'}
                            </button>
                          ) : (
                            <button type="button" disabled={connBusy === code} onClick={() => demoConnect(code)}
                              title="Live connect needs this platform's API credentials on the server"
                              className="px-3 py-1 rounded-lg text-xs font-medium border bg-white text-violet-600 border-violet-200 hover:bg-violet-50 disabled:opacity-50">
                              {connBusy === code ? '…' : 'Try demo'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Your data (privacy) */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Your data</h4>
                <p className="text-xs text-slate-400 mb-3">Download everything we hold about you, or ask us to delete your account.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={downloadMyData}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50">
                    Download my data
                  </button>
                  <button type="button" onClick={requestDeletion}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50">
                    Request account deletion
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveProfile} disabled={!!uploadError || !!uploadingField}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Report User</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue…"
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-slate-200"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReport(false)} className="px-4 py-2 rounded-lg text-slate-600">Cancel</button>
              <button onClick={handleReport} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
