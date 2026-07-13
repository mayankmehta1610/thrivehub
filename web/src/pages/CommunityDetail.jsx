import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, UserPlus, Check, Image as ImageIcon, Send, Shield, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import SafeImage from '../components/SafeImage'
import RichText from '../components/RichText'
import RichTextEditor from '../components/RichTextEditor'
import { isValidImageUrl, isVideoUrl, isAudioUrl } from '../utils/images'
import { getUploadLimits, getFileSizeError } from '../utils/upload'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function CommunityDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const requireAuth = useRequireAuth()
  const [config, setConfig] = useState(null)
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [busy, setBusy] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  // composer state
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef(null)

  const isMember = !!community?.is_member
  const isAdmin = community?.my_role === 'admin' || community?.my_role === 'moderator'

  const loadPosts = (communityId) => {
    api.getPosts({ community_id: communityId, page_size: 30 }).then((d) => setPosts(d.items || []))
  }

  const reloadCommunity = async () => {
    const c = await api.getCommunity(slug)
    setCommunity(c)
    return c
  }

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    api.getCommunity(slug).then((c) => {
      setCommunity(c)
      loadPosts(c.id)
    })
    api.getCommunityMembers(slug).then(setMembers).catch(() => setMembers([]))
  }, [slug])

  const handleJoin = async () => {
    if (!requireAuth(AUTH_MESSAGES.joinCommunity)) return
    setBusy(true)
    try {
      if (community.is_member) {
        await api.leaveCommunity(slug)
        toast.success('Left community')
      } else {
        await api.joinCommunity(slug)
        toast.success('Joined community 🎉')
      }
      await reloadCommunity()
      api.getCommunityMembers(slug).then(setMembers).catch(() => {})
    } catch (err) {
      toast.error(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const limits = getUploadLimits(config)
    const sizeError = getFileSizeError(file, limits)
    if (sizeError) {
      toast.error(sizeError)
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await api.uploadMedia(file, limits)
      setMediaUrl(result.url)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!requireAuth(AUTH_MESSAGES.createPost)) return
    if (!body.trim() && !mediaUrl) return
    setPosting(true)
    try {
      await api.createPost({ body: body.trim() || ' ', image_url: mediaUrl || undefined, community_id: community.id })
      setBody('')
      setMediaUrl('')
      loadPosts(community.id)
      toast.success('Posted to community')
    } catch (err) {
      toast.error(err?.message || 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  const changeRole = async (member, role) => {
    try {
      await api.updateCommunityMemberRole(slug, member.user.id, role)
      toast.success(role === 'admin' ? `${member.user.display_name} is now a co-admin` : 'Role updated')
      api.getCommunityMembers(slug).then(setMembers).catch(() => {})
    } catch (err) {
      toast.error(err?.message || 'Could not update role')
    }
  }

  if (!community) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto">
        {isValidImageUrl(community.cover_url) ? (
          <SafeImage src={community.cover_url} alt="" className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 gradient-hero" />
        )}
        <div className="px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {community.name}
                {isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">You're an admin</span>}
              </h1>
              <button onClick={() => setShowMembers(true)} className="text-slate-500 flex items-center gap-1 mt-1 hover:text-violet-600">
                <Users className="w-4 h-4" /> {community.member_count} members
              </button>
            </div>
            <button
              onClick={handleJoin}
              disabled={busy}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium disabled:opacity-60 shrink-0 ${
                community.is_member
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                  : 'gradient-hero text-white'
              }`}
            >
              {community.is_member ? <><Check className="w-4 h-4" /> Joined</> : <><UserPlus className="w-4 h-4" /> Join</>}
            </button>
          </div>
          {community.description && <RichText text={community.description} className="mt-4 text-slate-600" />}

          {/* Composer — members and co-admins can post */}
          {isMember ? (
            <form onSubmit={handlePost} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mt-6">
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder={`Share something with ${community.name}…`}
                rows={3}
              />
              {mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-100 mb-2">
                  {isAudioUrl(mediaUrl)
                    ? <audio src={mediaUrl} controls className="w-full" />
                    : isVideoUrl(mediaUrl)
                      ? <video src={mediaUrl} controls className="w-full max-h-64 bg-black" />
                      : <SafeImage src={mediaUrl} alt="" className="w-full max-h-64 object-cover" />}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFile} />
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
                  title="Upload a photo, video or audio file"
                >
                  <ImageIcon className="w-5 h-5" /> {uploading ? 'Uploading…' : 'Photo / Video / Audio'}
                </button>
                <button
                  type="submit"
                  disabled={posting || uploading || (!body.trim() && !mediaUrl)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-hero text-white font-medium text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Post
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-6 text-center text-slate-500 text-sm">
              Join this community to post and take part.
            </div>
          )}

          <h2 className="text-lg font-bold mt-8 mb-4">Community Posts</h2>
          {posts.length === 0 ? (
            <p className="text-slate-400">No posts yet in this community.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onUpdate={() => loadPosts(community.id)} isOwn={p.author?.id === user?.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold">Members</h3>
              <button onClick={() => setShowMembers(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-2">
              {members.map((m) => (
                <div key={m.user?.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  <SafeImage src={m.user?.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{m.user?.display_name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      @{m.user?.username}
                      {(m.role === 'admin' || m.role === 'moderator') && (
                        <span className="inline-flex items-center gap-0.5 text-violet-600 font-medium"><Shield className="w-3 h-3" /> {m.role}</span>
                      )}
                    </p>
                  </div>
                  {isAdmin && m.user?.id !== user?.id && (
                    m.role === 'admin'
                      ? <button onClick={() => changeRole(m, 'member')} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Remove admin</button>
                      : <button onClick={() => changeRole(m, 'admin')} className="text-xs px-2.5 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50">Make co-admin</button>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="p-4 text-center text-slate-400 text-sm">No members yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
