import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowLeft, Clock, Ticket, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Navbar from '../components/Navbar'
import SafeImage from '../components/SafeImage'
import RichText from '../components/RichText'
import { isValidImageUrl, isVideoUrl, isAudioUrl } from '../utils/images'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const requireAuth = useRequireAuth()
  const [config, setConfig] = useState(null)
  const [event, setEvent] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
    setEvent(null)
    setNotFound(false)
    setRegistered(false)
    api.getEvent(id).then((ev) => {
      setEvent(ev)
      setRegistered(!!ev.is_registered)
    }).catch(() => setNotFound(true))
  }, [id])

  const handleRegister = async () => {
    if (!requireAuth(AUTH_MESSAGES.registerEvent)) return
    setRegistering(true)
    try {
      const res = await api.registerEvent(id)
      setRegistered(true)
      const updated = await api.getEvent(id)
      setEvent(updated)
      toast.success(res?.status === 'already_registered' ? "You're already registered" : "You're registered! 🎉")
    } catch (err) {
      toast.error(err?.message || 'Could not register for this event')
    } finally {
      setRegistering(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar config={config} />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 text-lg">This event could not be found.</p>
          <Link to="/events" className="inline-block mt-4 font-semibold text-fuchsia-600 hover:underline">← Back to all events</Link>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Loading event…</div>
      </div>
    )
  }

  const capacityLabel = event.capacity ? `${event.participant_count}/${event.capacity}` : `${event.participant_count}`
  const isFull = event.capacity && event.participant_count >= event.capacity

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} />
      <div className="max-w-3xl mx-auto pb-16">
        {/* Hero */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          {isValidImageUrl(event.image_url) && !isVideoUrl(event.image_url) && !isAudioUrl(event.image_url) ? (
            <SafeImage src={event.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-hero" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-sm font-medium text-slate-800 hover:bg-white shadow"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500 text-white text-xs font-semibold shadow">
              <Calendar className="w-3.5 h-3.5" /> {new Date(event.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mt-3 drop-shadow">{event.title}</h1>
          </div>
        </div>

        <div className="px-4 md:px-6 -mt-4 relative">
          {/* Info card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">When</p>
                  <p className="text-sm font-medium text-slate-800">{formatDateTime(event.start_at)}</p>
                  {event.end_at && <p className="text-xs text-slate-500">until {formatDateTime(event.end_at)}</p>}
                </div>
              </div>
              {event.venue && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Where</p>
                    <p className="text-sm font-medium text-slate-800">{event.venue}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Attendance</p>
                  <p className="text-sm font-medium text-slate-800">{capacityLabel} registered</p>
                </div>
              </div>
              {event.organiser && (
                <div className="flex items-start gap-3">
                  <SafeImage
                    src={event.organiser.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Organiser</p>
                    {event.organiser.username ? (
                      <Link to={`/profile/${event.organiser.username}`} className="text-sm font-medium text-fuchsia-600 hover:underline">
                        {event.organiser.display_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{event.organiser.display_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleRegister}
                disabled={registering || (isFull && !registered)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-hero text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registered ? <><CheckCircle2 className="w-5 h-5" /> Registered</> : isFull ? 'Event full' : <><Ticket className="w-5 h-5" /> Register</>}
              </button>
              {event.status && (
                <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium capitalize">{event.status}</span>
              )}
            </div>
          </div>

          {/* Video / audio media (images are shown in the hero) */}
          {isValidImageUrl(event.image_url) && (isVideoUrl(event.image_url) || isAudioUrl(event.image_url)) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mt-4 overflow-hidden">
              {isAudioUrl(event.image_url)
                ? <audio src={event.image_url} controls className="w-full" />
                : <video src={event.image_url} controls className="w-full max-h-96 rounded-xl bg-black" />}
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 mt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-3">About this event</h2>
            {event.description?.trim() ? (
              <RichText text={event.description} className="text-slate-700" />
            ) : (
              <p className="text-slate-400 italic">No description provided.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
