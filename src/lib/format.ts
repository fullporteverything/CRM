export const DAY = 86_400_000

export function money(n: number, opts: { short?: boolean; cents?: boolean } = {}) {
  const neg = n < 0
  const v = Math.abs(n)
  let s: string
  if (opts.short !== false && v >= 1_000_000) s = `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  else if (opts.short !== false && v >= 1000) s = `$${(v / 1000).toFixed(1)}k`
  else s = `$${v.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })}`
  return (neg ? '−' : '') + s
}
export const fullMoney = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

export const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

export function ago(t: number | null | undefined, now = Date.now()) {
  if (!t) return 'never'
  const s = Math.round((now - t) / 1000)
  if (s < 0) return inFuture(t, now)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`
  const d = Math.round(s / 86_400)
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d} days ago`
  if (d < 365) return `${Math.round(d / 30)} mo ago`
  return `${Math.round(d / 365)} y ago`
}

export function inFuture(t: number, now = Date.now()) {
  const d = Math.round((t - now) / DAY)
  if (d <= 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `in ${d}d`
}

export const shortDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const longDate = (t: number) => new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
export const timeOf = (t: number) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function initials(name: string) {
  const clean = name.replace(/@.*/, '').replace(/[._\-+0-9]+/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// A stable, pleasant pastel for an avatar, from any string.
const PALETTE: [string, string][] = [
  ['#f3c9b4', '#6b2f17'], ['#cfe3f7', '#1f4a75'], ['#d9f0dc', '#285a33'], ['#f6e3a8', '#6b5208'],
  ['#e3d7f7', '#4b3080'], ['#f5d0dc', '#7a2443'], ['#cdeeed', '#145c5a'], ['#e6e1d8', '#4f463a'],
]
export function tint(key: string): [string, string] {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
// Square "company" marks use deeper tones, like the reference design.
const MARKS: [string, string][] = [
  ['#3b2a12', '#f0b35a'], ['#123540', '#5fc4dc'], ['#2d1f4d', '#a88bf5'], ['#13284d', '#7aa8f5'],
  ['#3d1616', '#f07a7a'], ['#123a2a', '#5fd49b'], ['#1a3a3a', '#5fcbc7'], ['#3a1a33', '#e27ccf'],
]
export function mark(key: string): [string, string] {
  let h = 7
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0
  return MARKS[h % MARKS.length]
}

export function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function quarterOf(t: number) {
  const d = new Date(t)
  const q = Math.floor(d.getMonth() / 3)
  const start = new Date(d.getFullYear(), q * 3, 1).getTime()
  const end = new Date(d.getFullYear(), q * 3 + 3, 1).getTime()
  const prevStart = new Date(d.getFullYear(), q * 3 - 3, 1).getTime()
  const week = Math.floor((t - start) / (7 * DAY)) + 1
  return { q: q + 1, start, end, prevStart, week }
}

export function startOfWeek(t: number) {
  const d = new Date(t)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime()
}
export const startOfDay = (t: number) => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
