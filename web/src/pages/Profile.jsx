import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Globe, UserPlus, UserMinus } from 'lucide-react'
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

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getProfile(username).then(setProfile)
    api.getPosts({ author_id: undefined, page_size: 20 }).then((data) => {
      const filtered = data.items.filter((p) => p.author?.username === username)
      setPosts(filtered.length ? filtered : data.items)
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
            {!isOwn && (
              <button onClick={toggleFollow}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm mb-2 ${
                  following ? 'bg-slate-200 text-slate-700' : 'gradient-hero text-white'
                }`}>
                {following ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </button>
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
    </div>
  )
}
