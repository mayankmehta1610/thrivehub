import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Globe, UserPlus, UserMinus, Ban, VolumeX, Flag, Edit } from 'lucide-react'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
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

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getProfile(username).then((p) => {
      setProfile(p)
      setEditForm({ display_name: p.display_name, bio: p.bio, location: p.location, website: p.website })
    })
    api.getPosts({ page_size: 20 }).then((data) => {
      const filtered = data.items.filter((p) => p.author?.username === username)
      setPosts(filtered)
    })
  }, [username])

  const isOwn = currentUser?.profile?.username === username

  const toggleFollow = async () => {
    if (following) {
      await api.unfollowUser(username)
      setFollowing(false)
    } else {
      await api.followUser(username)
      setFollowing(true)
    }
  }

  const handleBlock = async () => {
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
    if (!profile?.user_id || !reportReason.trim()) return
    await api.createReport({
      target_type: 'user',
      target_id: profile.user_id,
      description: reportReason,
    })
    setShowReport(false)
    setReportReason('')
    alert('Report submitted')
  }

  const saveProfile = async () => {
    const updated = await api.updateProfile(editForm)
    setProfile(updated)
    setEditing(false)
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto">
        <div className="relative h-48 md:h-56">
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="px-4 -mt-16 relative">
          <div className="flex items-end gap-4">
            <img src={profile.avatar_url} alt="" className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-lg" />
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                {profile.display_name}
                {profile.is_verified && <span className="text-teal-300 text-sm">✓</span>}
              </h1>
              <p className="text-white/80 drop-shadow">@{profile.username}</p>
            </div>
            {isOwn ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm mb-2 bg-white text-slate-700">
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2 mb-2">
                <button onClick={toggleFollow}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${
                    following ? 'bg-slate-200 text-slate-700' : 'gradient-hero text-white'
                  }`}>
                  {following ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                </button>
                <button onClick={handleBlock} title="Block"
                  className={`p-2 rounded-xl ${blocked ? 'bg-red-100 text-red-600' : 'bg-white text-slate-500'}`}>
                  <Ban className="w-4 h-4" />
                </button>
                <button onClick={handleMute} title="Mute"
                  className={`p-2 rounded-xl ${muted ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-500'}`}>
                  <VolumeX className="w-4 h-4" />
                </button>
                <button onClick={() => setShowReport(true)} title="Report"
                  className="p-2 rounded-xl bg-white text-slate-500">
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-4">
            <p className="text-slate-600">{profile.bio}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{profile.location}</span>}
              {profile.website && <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{profile.website}</span>}
            </div>
          </div>

          <div className="py-6 space-y-4">
            <h2 className="text-lg font-bold">Posts</h2>
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Edit Profile</h3>
            {['display_name', 'bio', 'location', 'website', 'avatar_url'].map((field) => (
              <input key={field} value={editForm[field] || ''} placeholder={field.replace('_', ' ')}
                onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border" />
            ))}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-slate-600">Cancel</button>
              <button onClick={saveProfile} className="px-4 py-2 rounded-xl gradient-hero text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Report User</h3>
            <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue..." rows={4} className="w-full px-4 py-2 rounded-xl border" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReport(false)} className="px-4 py-2 rounded-xl text-slate-600">Cancel</button>
              <button onClick={handleReport} className="px-4 py-2 rounded-xl bg-red-500 text-white">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
