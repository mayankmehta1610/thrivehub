// External channels a user can connect and cross-post to.
// (lucide-react dropped brand icons, so we use emoji for recognisable marks.)
export const SOCIAL_PROVIDERS = [
  { code: 'youtube', label: 'YouTube', emoji: '▶️', color: 'text-red-600' },
  { code: 'instagram', label: 'Instagram', emoji: '📸', color: 'text-pink-600' },
  { code: 'x', label: 'X', emoji: '✖️', color: 'text-slate-800' },
  { code: 'facebook', label: 'Facebook', emoji: '👍', color: 'text-blue-600' },
]

export const SOCIAL_META = Object.fromEntries(SOCIAL_PROVIDERS.map((p) => [p.code, p]))
