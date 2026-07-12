import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Users, Calendar, MessageCircle, Trophy,
  MapPin, ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react'
import api, { wakeApi } from '../api/client'
import Navbar from '../components/Navbar'
import AuthLink from '../components/AuthLink'
import SafeImage from '../components/SafeImage'
import { DEFAULT_PLACEHOLDER } from '../utils/images'
import { AUTH_MESSAGES } from '../utils/authMessages'
import { useRequireAuth } from '../hooks/useRequireAuth'

const FALLBACK_CONFIG = {
  app_name: 'ThriveHub',
  tagline: 'Where skills, sports & adventures come alive',
  hero_image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=80&auto=format&fit=crop',
  hero_subtitle: 'Join vibrant communities for dance, comedy, sports, music & more',
  primary_color: '#7C3AED',
  secondary_color: '#D946EF',
  accent_color: '#F43F5E',
  features: [
    { code: 'profiles', label: 'Rich Profiles', description: 'Showcase skills, sports and achievements' },
    { code: 'communities', label: 'Communities', description: 'Join groups around your passions' },
    { code: 'events', label: 'Events', description: 'Discover workshops, meetups & tournaments' },
    { code: 'messaging', label: 'Messaging', description: 'Connect with friends and groups' },
  ],
  skill_categories: [
    { code: 'dance', label: 'Dance', description: 'Express yourself through movement', image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80' },
    { code: 'standup', label: 'Standup Comedy', description: 'Make them laugh on stage', image_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80' },
    { code: 'sports', label: 'Sports', description: 'Compete, train, and win together', image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80' },
    { code: 'adventure', label: 'Adventure', description: 'Explore trails, peaks, and beyond', image_url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800&q=80&auto=format&fit=crop' },
    { code: 'music', label: 'Music', description: 'Jam, perform, and discover artists', image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80&auto=format&fit=crop' },
    { code: 'art', label: 'Art & Design', description: 'Create, share, and inspire', image_url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80' },
    { code: 'fitness', label: 'Fitness', description: 'Build strength and healthy habits', image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
    { code: 'photography', label: 'Photography', description: 'Capture moments that matter', image_url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80' },
  ],
  stats: { members: 0, communities: 0, events: 0, skill_categories: 8 },
}

function Carousel({ children, className = '' }) {
  const scroll = (dir) => {
    const el = document.getElementById('landing-carousel')
    if (el) el.scrollBy({ left: dir * 340, behavior: 'smooth' })
  }
  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-md bg-white shadow-lg border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-4"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </button>
      <div id="landing-carousel" className="flex gap-6 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scrollbar-hide">
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-md bg-white shadow-lg border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-4"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-slate-700" />
      </button>
    </div>
  )
}

function formatEventDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Landing() {
  const [config, setConfig] = useState(FALLBACK_CONFIG)
  const requireAuth = useRequireAuth()

  useEffect(() => {
    wakeApi()
      .then(() => api.getConfig())
      .then((data) => setConfig({ ...FALLBACK_CONFIG, ...data }))
      .catch(() => {})
  }, [])

  const features = config?.features || FALLBACK_CONFIG.features
  const categories = config?.skill_categories?.length ? config.skill_categories : FALLBACK_CONFIG.skill_categories
  const communities = config?.featured_communities || []
  const events = config?.featured_events || []
  const posts = config?.featured_posts || []
  const sponsors = config?.sponsorships || []
  const stats = config?.stats || {}
  const icons = [Trophy, Users, Calendar, MessageCircle]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar config={config} dark />

      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <SafeImage
          src={config?.hero_image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          fallback={FALLBACK_CONFIG.hero_image || DEFAULT_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/95 via-fuchsia-900/70 to-rose-800/45" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 backdrop-blur-sm text-sm font-medium text-violet-200 mb-6 animate-fade-in border border-white/10">
              <TrendingUp className="w-4 h-4" />
              {stats.members ? `${stats.members}+ members thriving` : 'Join the community'}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] text-white mb-6 animate-fade-in-up tracking-tight">
              {config?.app_name || 'ThriveHub'}
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-2xl mb-3 font-medium leading-relaxed">
              {config?.tagline || 'Skills, Sports & Adventure Community'}
            </p>
            {config?.hero_subtitle && (
              <p className="text-base md:text-lg text-slate-400 max-w-xl mb-10 leading-relaxed">
                {config.hero_subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mb-14">
              <Link to="/register" className="btn-primary text-base">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-outline text-base">
                Sign In
              </Link>
            </div>
            {(stats.members > 0 || stats.communities > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                {[
                  { value: stats.members, label: 'Members' },
                  { value: stats.communities, label: 'Communities' },
                  { value: stats.events, label: 'Events' },
                  { value: stats.skill_categories, label: 'Categories' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
                    <div className="text-sm text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Skill Categories */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-2">Discover</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                Explore your passion
              </h2>
              <p className="text-slate-500 text-lg mt-2 max-w-xl">
                Dance, comedy, sports, adventure & more — find your tribe
              </p>
            </div>
            <AuthLink to="/feed" message={AUTH_MESSAGES.default} className="text-violet-600 font-semibold hover:text-violet-700 transition-colors hidden md:block">
              View all categories →
            </AuthLink>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {categories.map((cat) => (
              <AuthLink
                key={cat.code}
                to="/feed"
                message={AUTH_MESSAGES.default}
                className="group relative rounded-lg overflow-hidden aspect-[3/4] card-hover shadow-sm border border-slate-100"
              >
                <SafeImage
                  src={cat.image_url}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-fuchsia-900/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold text-white text-base leading-tight">{cat.label}</h3>
                  {cat.description && (
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">{cat.description}</p>
                  )}
                </div>
              </AuthLink>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Communities */}
      {communities.length > 0 && (
        <section className="py-20 md:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-2">Communities</p>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Featured groups</h2>
                <p className="text-slate-500 mt-1">Join groups built around what you love</p>
              </div>
              <AuthLink to="/communities" message={AUTH_MESSAGES.joinCommunity} className="text-violet-600 font-semibold hover:text-violet-700 hidden sm:block">
                See all →
              </AuthLink>
            </div>
            <Carousel>
              {communities.map((c) => (
                <AuthLink
                  key={c.id}
                  to={c.slug ? `/communities/${c.slug}` : '/communities'}
                  message={AUTH_MESSAGES.joinCommunity}
                  className="flex-none w-72 snap-start rounded-lg overflow-hidden card-hover bg-white border border-slate-200 shadow-sm"
                >
                  <div className="h-40 overflow-hidden">
                    <SafeImage src={c.cover_url} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-slate-900">{c.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mt-1.5 leading-relaxed">{c.description}</p>
                    <p className="text-slate-600 text-sm font-medium mt-3 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-violet-600" /> {c.member_count} members
                    </p>
                  </div>
                </AuthLink>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-10">
              <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-2">Events</p>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Upcoming near you</h2>
              <p className="text-slate-500 mt-1">Workshops, meetups, and tournaments</p>
            </div>
            <Carousel>
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex-none w-80 snap-start rounded-lg overflow-hidden card-hover bg-white border border-slate-200 shadow-sm"
                >
                  <div className="h-44 relative">
                    <SafeImage src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-violet-600/90 text-white text-xs font-semibold">
                      {formatEventDate(e.start_at)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-slate-900">{e.title}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {e.venue}
                    </p>
                    <p className="text-slate-400 text-xs mt-2 line-clamp-2">{e.description}</p>
                    <p className="text-violet-600 text-sm font-medium mt-3">
                      {e.participant_count} registered
                    </p>
                    <button
                      type="button"
                      onClick={() => requireAuth(AUTH_MESSAGES.registerEvent)}
                      className="mt-3 w-full py-2 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors"
                    >
                      Register
                    </button>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* Community Moments */}
      {posts.length > 0 && (
        <section className="py-20 md:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-2">Stories</p>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Community moments</h2>
              <p className="text-slate-500 mt-2">Real stories from real members</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((p) => (
                <div key={p.id} className="rounded-lg overflow-hidden card-hover bg-white border border-slate-200 shadow-sm">
                  {p.image_url && (
                    <SafeImage src={p.image_url} alt="" className="w-full h-48 object-cover" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      {p.author_avatar && (
                        <SafeImage src={p.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <span className="font-semibold text-sm text-slate-900">{p.author_name}</span>
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-14 bg-violet-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-slate-400 text-center text-xs mb-8 uppercase tracking-widest">Community Partners</p>
            <div className="flex flex-wrap justify-center gap-6">
              {sponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.link_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-64 rounded-lg overflow-hidden card-hover opacity-90 hover:opacity-100 border border-violet-800"
                >
                  <SafeImage src={s.image_url} alt={s.sponsor_name} className="w-full h-32 object-cover" />
                  <div className="bg-violet-900 px-4 py-2.5 text-white text-sm font-medium text-center">
                    {s.sponsor_name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-2">Platform</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Why ThriveHub</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = icons[i % icons.length]
              return (
                <div key={f.code} className="p-6 rounded-lg border border-slate-200 bg-slate-50 card-hover">
                  <div className="w-11 h-11 rounded-md gradient-hero flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{f.label}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <SafeImage
          src={config?.hero_image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          fallback={FALLBACK_CONFIG.hero_image || DEFAULT_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-fuchsia-950/80 to-rose-900/70" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to thrive?
          </h2>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">
            Join dancers, comedians, athletes, artists, and adventurers building something amazing together.
          </p>
          <Link to="/register" className="btn-primary text-lg px-10 py-4">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
