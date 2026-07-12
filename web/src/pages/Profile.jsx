import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MapPin, Globe, UserPlus, UserMinus, Ban, VolumeX, Flag, Edit,
  BadgeCheck, Camera, X, Users, FileText, MessageCircle,
} from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'
import { filterValidImages } from '../utils/images'
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

  const toggleConnection = async (provider, connected) => {
    setConnBusy(provider)
    try {
      if (connected) {
        await api.disconnectSocial(provider)
        toast.success('Disconnected')
      } else {
        await api.connectSocial(provider)
        toast.success('Connected 🎉')
      }
      setConnections(await api.getSocialConnections())
    } catch (err) {
      toast.error(err?.message || 'Could not update connection')
    } finally {
      setConnBusy('')
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
    try {
      const result = await api.uploadMedia(file, limits)
      setEditForm((prev) => ({ ...prev, [field]: result.url }))
    } catch (err) {
      setUploadError(err.message)
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
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
            <div className="flex gap-2">
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'avatar_url')}
              />
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Upload avatar
              </button>
              <input
                ref={coverFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'cover_url')}
              />
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Upload cover
              </button>
            </div>
            {['display_name', 'bio', 'location', 'website', 'avatar_url', 'cover_url'].map((field) => (
              field === 'bio' ? (
                <textarea
                  key={field}
                  value={editForm[field] || ''}
                  placeholder="Bio"
                  rows={4}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                />
              ) : (
                <input
                  key={field}
                  value={editForm[field] || ''}
                  placeholder={field.replace(/_/g, ' ')}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                />
              )
            ))}
            {/* Connected accounts — cross-post to external channels */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Connected Accounts</h4>
              <p className="text-xs text-slate-400 mb-3">
                Connect channels to also publish your posts there. (Live publishing to each platform
                requires that platform's API credentials — connecting here enables cross-post targets.)
              </p>
              <div className="space-y-2">
                {SOCIAL_PROVIDERS.map(({ code, label, emoji }) => {
                  const conn = connections.find((c) => c.provider === code)
                  const connected = !!conn?.connected
                  return (
                    <div key={code} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span aria-hidden="true">{emoji}</span> {label}
                        {connected && conn?.external_username && (
                          <span className="text-xs text-slate-400">@{conn.external_username}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={connBusy === code}
                        onClick={() => toggleConnection(code, connected)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border disabled:opacity-50 ${
                          connected
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'
                        }`}
                      >
                        {connBusy === code ? '…' : connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={!!uploadError}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
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
