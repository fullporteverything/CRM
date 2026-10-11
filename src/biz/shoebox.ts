// Shoebox connector. Signs in with a Shoebox admin account (the app's own
// sign-in: the password never leaves this browser, only a proof derived from
// it) and reads account metadata through the shoebox_admin_* database
// functions. Receipts and profiles are encrypted with keys the server doesn't
// have, so this connector only ever sees counts, never contents.

import type { Actions, Agent, AssistItem, Contact, Dataset, Deal, FeedItem, Activity, ActivityKind, Review, Business } from './types'
import { DAY, ago, fullMoney, initials, money, plural, shortDate, startOfDay } from '../lib/format'

const DEFAULT_URL = 'https://ovxykjbnpozndcgxkqwg.supabase.co'
// Publishable key: meant to ship in browser code. Access is enforced by the database functions.
const DEFAULT_KEY = 'sb_publishable_fPRIF6--vbM43dtVTDI21g_Pussn_NV'

export class ShoeboxError extends Error {
  constructor(public code: 'offline' | 'session_ended' | 'forbidden' | 'server', message: string) {
    super(message)
  }
}

const cfg = (b: Business) => ({ url: b.config?.url || DEFAULT_URL, key: b.config?.key || DEFAULT_KEY })

async function rpc<T>(b: Business, fn: string, args: Record<string, unknown>): Promise<T> {
  const { url, key } = cfg(b)
  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new ShoeboxError('offline', 'Couldn’t reach Shoebox. Check your connection.')
  }
  const text = await res.text()
  if (!res.ok) {
    if (text.includes('session_ended')) throw new ShoeboxError('session_ended', 'Your Shoebox session ended. Sign in again.')
    if (text.includes('forbidden')) throw new ShoeboxError('forbidden', 'This Shoebox account isn’t an admin.')
    throw new ShoeboxError('server', `Shoebox returned an error (${res.status}).`)
  }
  return (text ? JSON.parse(text) : null) as T
}

// ---------- sign-in ----------

const enc = new TextEncoder()
const b64 = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s)
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

// Same derivation as Shoebox's crypto.deriveSecrets: PBKDF2 bits, then
// HKDF('server-auth'). Only the proof is sent; the key-encryption half isn't
// needed here and is never derived.
async function deriveAuth(password: string, salt: string, iterations: number) {
  const subtle = crypto.subtle
  const base = await subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations }, base, 256))
  const hk = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveBits'])
  bits.fill(0)
  const auth = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('shoebox/v1'), info: enc.encode('server-auth') }, hk, 256)
  return b64(auth)
}

const DEVICE_KEY = 'foreman:shoebox:device'
function device() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'unknown'
  let id = ''
  try { id = localStorage.getItem(DEVICE_KEY) ?? '' } catch { /* blocked */ }
  return { id, label: `Foreman CRM · ${browser} on ${os}`, ua, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
}

const tokenKey = (b: Business) => `foreman:shoebox:${b.id}:session`
export function savedSession(b: Business): { token: string; email: string } | null {
  try {
    const s = localStorage.getItem(tokenKey(b))
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}
function saveSession(b: Business, s: { token: string; email: string } | null) {
  try {
    if (s) localStorage.setItem(tokenKey(b), JSON.stringify(s))
    else localStorage.removeItem(tokenKey(b))
  } catch { /* storage blocked: session lasts for this tab */ }
}

export type SignInStep =
  | { ok: true }
  | { twoFactor: true; ticket: string }
  | { error: string; wipeWarning?: string }

type LoginResponse = {
  token?: string; device_id?: string; two_factor?: boolean; ticket?: string
  error?: string; failed?: number; code_failed?: number; wipe_after?: number; until?: number
}

async function finish(b: Business, email: string, r: LoginResponse): Promise<SignInStep> {
  if (r.two_factor && r.ticket) return { twoFactor: true, ticket: r.ticket }
  if (r.token) {
    if (r.device_id) try { localStorage.setItem(DEVICE_KEY, r.device_id) } catch { /* blocked */ }
    try {
      await rpc(b, 'shoebox_admin_me', { p_token: r.token })
    } catch (e) {
      // Signed in, but not an admin: end that session so it doesn't linger.
      await rpc(b, 'shoebox_sign_out', { p_token: r.token, p_device: null, p_others: false }).catch(() => {})
      return { error: e instanceof ShoeboxError ? e.message : 'Couldn’t check admin access.' }
    }
    saveSession(b, { token: r.token, email })
    return { ok: true }
  }
  const wipe = r.wipe_after && r.code_failed ? `${r.code_failed} of ${r.wipe_after} wrong codes. Your Shoebox security policy wipes the vault after ${r.wipe_after}.` : undefined
  switch (r.error) {
    case 'no_account': return { error: 'No Shoebox account uses that email.' }
    case 'bad_password': return { error: 'That password isn’t right.' }
    case 'bad_code': return { error: 'That code isn’t right.', wipeWarning: wipe }
    case 'locked': return { error: `Too many tries. Try again ${r.until ? 'at ' + new Date(r.until).toLocaleTimeString() : 'later'}.` }
    case 'expired': return { error: 'That sign-in took too long. Start again.' }
    case 'shredded': return { error: 'This account’s vault was shredded.' }
    default: return { error: 'Couldn’t sign in.' }
  }
}

export async function signIn(b: Business, email: string, password: string): Promise<SignInStep> {
  const em = email.trim().toLowerCase()
  const pre = await rpc<{ exists: boolean; salt?: string; iterations?: number; shredded?: boolean }>(b, 'shoebox_prelogin', { p_email: em })
  if (!pre.exists || !pre.salt || !pre.iterations) return { error: 'No Shoebox account uses that email.' }
  if (pre.shredded) return { error: 'This account’s vault was shredded.' }
  const auth = await deriveAuth(password, pre.salt, pre.iterations)
  const r = await rpc<LoginResponse>(b, 'shoebox_login', { p_email: em, p_auth: auth, p_device: device() })
  return finish(b, em, r)
}

export async function signIn2fa(b: Business, email: string, ticket: string, code: string): Promise<SignInStep> {
  const r = await rpc<LoginResponse>(b, 'shoebox_login_2fa', { p_ticket: ticket, p_code: code.replace(/\s/g, ''), p_recovery: false })
  return finish(b, email.trim().toLowerCase(), r)
}

export async function signOut(b: Business) {
  const s = savedSession(b)
  saveSession(b, null)
  if (s) await rpc(b, 'shoebox_sign_out', { p_token: s.token, p_device: null, p_others: false }).catch(() => {})
}

// ---------- reading ----------

type Raw = {
  now: number
  founding_closes: number
  accounts: {
    user_id: string; email: string; created_at: number; joined_at: number; founding_no: number | null
    shredded: boolean; incident: { at?: number; sensor?: string; detail?: string } | null; two_factor: boolean
    locked_until: number | null; failed: number; code_failed: number; admin: boolean
    records: Record<string, number>
    devices: { label: string; tz: string; created_at: number; last_seen: number; revoked: boolean }[]
    last_seen: number | null
    passes: { tax_year: number; amount: number; status: 'paid' | 'refunded'; founding: boolean; at: number }[]
    savings: { tax_year: number; amount: number; at: number }[]
  }[]
  reviews: { user_id: string; email: string; rating: number; body: string; display_name: string; role: string; status: Review['status']; created_at: number; updated_at: number }[]
  notes: { id: string; user_id: string; author: string | null; kind: ActivityKind; body: string; due_at: number | null; done: boolean; created_at: number }[]
}

const ONLINE = 5 * 60_000
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
const nameFromEmail = (e: string) => titleCase(e.split('@')[0].replace(/[._\-+]+/g, ' ').replace(/\d+/g, '').trim() || e.split('@')[0])
const platformOf = (label: string) => {
  const os = label.split(' on ').pop() ?? ''
  return /iPhone|iPad|iOS/.test(os) ? 'iPhone & iPad' : /Android/.test(os) ? 'Android' : /Windows/.test(os) ? 'Windows' : /Mac/.test(os) ? 'Mac' : os ? 'Other' : 'Unknown'
}
// The tax year people are working on: last year until filing season ends.
const taxYearAt = (t: number) => {
  const d = new Date(t)
  return d.getMonth() < 4 ? d.getFullYear() - 1 : d.getFullYear()
}

export function toDataset(raw: Raw, me: string): Dataset {
  const now = raw.now
  const ty = taxYearAt(now)
  const due = new Date(ty + 1, 3, 15).getTime()
  const accounts = raw.accounts
  const reviewOf = new Map(raw.reviews.map((r) => [r.user_id, r]))
  const nameOf = (a: Raw['accounts'][number]) => reviewOf.get(a.user_id)?.display_name || nameFromEmail(a.email)
  const receiptsOf = (a: Raw['accounts'][number]) => a.records.receipt ?? 0
  const recordsOf = (a: Raw['accounts'][number]) => (a.records.receipt ?? 0) + (a.records.income ?? 0) + (a.records.trip ?? 0)
  const savedOf = (a: Raw['accounts'][number]) => a.savings.find((s) => s.tax_year === ty)?.amount ?? Math.max(0, ...a.savings.map((s) => s.amount))
  const paid = (a: Raw['accounts'][number]) => a.passes.filter((p) => p.status === 'paid')

  const contacts: Contact[] = accounts.map((a) => {
    const passes = paid(a)
    const value = passes.reduce((s, p) => s + p.amount / 100, 0)
    const idle = a.last_seen ? now - a.last_seen : Infinity
    const status: Contact['status'] = a.shredded ? 'closed'
      : a.locked_until ? 'locked'
      : passes.some((p) => p.tax_year === ty) ? 'customer'
      : recordsOf(a) > 0 && idle > 21 * DAY ? 'at_risk'
      : recordsOf(a) > 0 ? 'active' : 'lead'
    const plan = [a.founding_no ? `Founding #${a.founding_no}` : 'Member', passes.length ? `${passes[passes.length - 1].tax_year} pass` : 'Free'].join(' · ')
    return {
      id: a.user_id,
      name: nameOf(a),
      email: a.email,
      company: plan,
      status,
      value,
      lastTouch: a.last_seen,
      joinedAt: a.joined_at,
      devices: a.devices.map((d) => ({ label: d.label, lastSeen: d.last_seen, createdAt: d.created_at, revoked: d.revoked })),
      tags: [a.admin ? 'Admin' : '', a.two_factor ? '2FA on' : '2FA off'].filter(Boolean),
      facts: [
        { label: 'Receipts', value: String(receiptsOf(a)) },
        { label: 'Income records', value: String(a.records.income ?? 0) },
        { label: 'Trip logs', value: String(a.records.trip ?? 0) },
        { label: `Saved ${ty}`, value: savedOf(a) ? fullMoney(savedOf(a)) : '—' },
        { label: 'Devices', value: String(a.devices.filter((d) => !d.revoked).length) },
        { label: 'Two-factor', value: a.two_factor ? 'On' : 'Off' },
        ...(a.failed || a.code_failed ? [{ label: 'Failed sign-ins', value: `${a.failed}${a.code_failed ? ` (${a.code_failed} codes)` : ''}` }] : []),
        ...(a.shredded && a.incident ? [{ label: 'Shredded', value: a.incident.at ? shortDate(a.incident.at) : 'yes' }] : []),
      ],
    }
  })

  // One open deal per account: their pass for this tax year. Stage follows
  // how much they use Shoebox (an estimate of how likely they are to buy).
  const deals: Deal[] = []
  for (const a of accounts) {
    if (a.shredded) continue
    const name = nameOf(a)
    for (const p of paid(a)) {
      deals.push({ id: `${a.user_id}:${p.tax_year}`, contactId: a.user_id, company: name, title: `${p.tax_year} Tax Year Pass`, value: p.amount / 100, stage: 'won', due: null, closedAt: p.at, owner: initials(name) })
    }
    if (paid(a).some((p) => p.tax_year === ty)) continue
    const n = recordsOf(a)
    const saved = savedOf(a)
    const stage = n >= 30 || saved >= 500 ? 'power' : n >= 10 || saved > 0 ? 'engaged' : n > 0 ? 'using' : 'signed'
    const founding = !!a.founding_no
    deals.push({
      id: `${a.user_id}:${ty}`, contactId: a.user_id, company: name, title: `${ty} Tax Year Pass${founding ? ' · founding' : ''}`,
      value: founding ? 39 : 59, stage, due, hot: stage === 'power' || (stage === 'engaged' && saved >= 200), owner: initials(name),
    })
  }

  const revenue = raw.accounts.flatMap((a) => paid(a).map((p) => ({ at: p.at, amount: p.amount / 100, contactId: a.user_id, label: `${p.tax_year} pass` })))
  const signups = raw.accounts.map((a) => a.joined_at)

  const platforms = new Map<string, number>()
  for (const a of accounts) {
    const d = a.devices.find((x) => !x.revoked && !x.label.startsWith('Foreman')) ?? a.devices[0]
    const p = d ? platformOf(d.label) : 'Unknown'
    platforms.set(p, (platforms.get(p) ?? 0) + 1)
  }
  const colors: Record<string, string> = { Mac: '#3fb3b0', Windows: '#4f8df0', 'iPhone & iPad': '#e8a948', Android: '#3fcf8e', Other: '#c27bd6', Unknown: '#6c7d7d' }
  const sources = [...platforms.entries()].sort((x, y) => y[1] - x[1]).map(([label, value]) => ({ label, value, color: colors[label] ?? '#6c7d7d' }))

  const leaderboard = [...accounts].filter((a) => !a.shredded).sort((x, y) => receiptsOf(y) - receiptsOf(x) || savedOf(y) - savedOf(x)).slice(0, 5).map((a) => ({
    name: nameOf(a), sub: `${plural(receiptsOf(a), 'receipt')}${savedOf(a) ? ` · ${fullMoney(savedOf(a))} saved` : ''}`, value: receiptsOf(a), unit: 'count' as const, contactId: a.user_id,
  }))

  const reviews: Review[] = raw.reviews.map((r) => ({ contactId: r.user_id, rating: r.rating, body: r.body, name: r.display_name, role: r.role, status: r.status, at: r.updated_at }))
  const pending = raw.reviews.filter((r) => r.status === 'pending')

  const activities: Activity[] = [
    ...raw.notes.map((n) => ({ id: n.id, contactId: n.user_id, kind: n.kind, title: n.kind === 'task' ? n.body.split('\n')[0] : labelOf(n.kind), body: n.kind === 'task' ? n.body.split('\n').slice(1).join('\n') : n.body, at: n.created_at, due: n.due_at, done: n.done, author: n.author ?? undefined })),
    ...raw.accounts.map((a) => ({ id: `join:${a.user_id}`, contactId: a.user_id, kind: 'event' as const, title: 'Signed up', body: a.founding_no ? `Founding member #${a.founding_no}` : undefined, at: a.joined_at })),
    ...raw.accounts.flatMap((a) => a.passes.map((p) => ({ id: `pass:${a.user_id}:${p.tax_year}`, contactId: a.user_id, kind: 'event' as const, title: p.status === 'paid' ? `Bought the ${p.tax_year} pass` : `${p.tax_year} pass refunded`, body: `${fullMoney(p.amount / 100)}${p.founding ? ' · founding price' : ''}`, at: p.at }))),
    ...raw.reviews.map((r) => ({ id: `review:${r.user_id}`, contactId: r.user_id, kind: 'event' as const, title: `Left a ${r.rating}-star review`, body: r.body, at: r.created_at })),
  ].sort((x, y) => y.at - x.at)

  // ---- cards ----
  const online = accounts.filter((a) => a.devices.some((d) => !d.revoked && !d.label.startsWith('Foreman') && now - d.last_seen < ONLINE)).length
  const activeToday = accounts.filter((a) => a.devices.some((d) => !d.label.startsWith('Foreman') && d.last_seen >= startOfDay(now))).length
  const founders = accounts.filter((a) => a.founding_no && !a.shredded).length
  const passCount = raw.accounts.reduce((s, a) => s + paid(a).length, 0)
  const twoFa = accounts.filter((a) => !a.shredded && a.two_factor).length
  const live = accounts.filter((a) => !a.shredded)

  const assist: AssistItem[] = [
    ...pending.map((r) => ({ id: `rv:${r.user_id}`, title: `Review from ${r.display_name}`, sub: `${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} · waiting ${ago(r.updated_at, now).replace(' ago', '')}`, tone: 'accent' as const, contactId: r.user_id, to: 'activities' })),
    ...accounts.filter((a) => a.code_failed > 0 && !a.shredded).map((a) => ({ id: `cf:${a.user_id}`, title: `${nameOf(a)}: wrong two-factor codes`, sub: `${a.code_failed} wrong after a correct password. Their vault wipes at the limit`, value: String(a.code_failed), tone: 'bad' as const, contactId: a.user_id })),
    ...accounts.filter((a) => a.locked_until).map((a) => ({ id: `lk:${a.user_id}`, title: `${nameOf(a)} is locked out`, sub: `${plural(a.failed, 'failed sign-in')} · until ${new Date(a.locked_until!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, tone: 'warn' as const, contactId: a.user_id })),
    ...accounts.filter((a) => a.shredded && a.incident?.at && now - a.incident.at < 30 * DAY).map((a) => ({ id: `sh:${a.user_id}`, title: `${nameOf(a)}’s vault was shredded`, sub: a.incident?.detail ?? a.incident?.sensor ?? 'Security sensor', tone: 'bad' as const, contactId: a.user_id })),
    ...accounts.filter((a) => !a.shredded && recordsOf(a) >= 10 && a.last_seen && now - a.last_seen > 21 * DAY).map((a) => ({ id: `ar:${a.user_id}`, title: `${nameOf(a)} went quiet`, sub: `${plural(receiptsOf(a), 'receipt')} · last seen ${ago(a.last_seen, now)}`, value: '$' + (a.founding_no ? 39 : 59), tone: 'warn' as const, contactId: a.user_id })),
  ]

  const openTasks = activities.filter((x) => x.kind === 'task' && !x.done).sort((x, y) => (x.due ?? Infinity) - (y.due ?? Infinity))
  const daysToClose = Math.ceil((raw.founding_closes - now) / DAY)
  const nextUp: Dataset['nextUp'] = openTasks[0]
    ? { title: openTasks[0].title, when: `${openTasks[0].due ? 'Due ' + shortDate(openTasks[0].due) : 'No due date'} · ${contacts.find((c) => c.id === openTasks[0].contactId)?.name ?? ''}`, badge: openTasks[0].due && openTasks[0].due < now ? 'Overdue' : 'Task', action: { label: 'Open account', to: 'contact', contactId: openTasks[0].contactId } }
    : pending[0]
      ? { title: `Approve ${pending[0].display_name}’s review`, when: `${pending[0].rating} stars · submitted ${ago(pending[0].updated_at, now)}`, badge: 'Waiting', action: { label: 'Review it', to: 'activities' } }
      : daysToClose > 0
        ? { title: 'Founding member window closes', when: `${new Date(raw.founding_closes).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${plural(daysToClose, 'day')} left · ${plural(founders, 'founder')} so far`, badge: 'Milestone', action: { label: 'See accounts', to: 'contacts' } }
        : null

  const signupsToday = signups.filter((t) => t >= startOfDay(now)).length
  const signupsWeek = signups.filter((t) => t >= now - 7 * DAY).length
  const zeroReceipts = live.filter((a) => recordsOf(a) === 0).length
  const quiet = live.filter((a) => recordsOf(a) >= 10 && a.last_seen && now - a.last_seen > 21 * DAY).length
  const locked = accounts.filter((a) => a.locked_until).length
  const savedTotal = live.reduce((s, a) => s + savedOf(a), 0)
  const weighted = deals.filter((d) => d.stage !== 'won').reduce((s, d) => s + d.value * (STAGE_P[d.stage] ?? 0), 0)
  const shredded = accounts.filter((a) => a.shredded).length
  const needs = pending.length + locked + accounts.filter((a) => a.code_failed > 0 && !a.shredded).length + openTasks.filter((t) => t.due && t.due < now + DAY).length

  const agents: Agent[] = [
    { id: 'chief', name: 'Chief of Staff', dept: 'exec', role: 'Reads every other desk and brings you only what needs a person.', watches: ['Everything below'], status: needs ? `${plural(needs, 'thing')} need you` : 'Nothing needs you', metric: { label: 'need you', value: String(needs) }, needsYou: needs },
    { id: 'growth', name: 'Growth Scout', dept: 'sales', role: 'Counts sign-ups and where they come from.', watches: ['Accounts', 'Join dates'], status: signupsToday ? `${plural(signupsToday, 'sign-up')} today` : signupsWeek ? `${plural(signupsWeek, 'sign-up')} this week` : 'No sign-ups this week yet', metric: { label: 'this week', value: String(signupsWeek) } },
    { id: 'onboard', name: 'Onboarding Coach', dept: 'sales', role: 'Spots accounts that signed up but haven’t added a receipt.', watches: ['Record counts'], status: zeroReceipts ? `${plural(zeroReceipts, 'account')} with no receipts yet` : 'Everyone has started', metric: { label: 'not started', value: String(zeroReceipts) } },
    { id: 'retention', name: 'Retention', dept: 'sales', role: 'Flags engaged people who stopped coming back.', watches: ['Last seen', 'Record counts'], status: quiet ? `${plural(quiet, 'engaged account')} went quiet` : 'No one engaged has gone quiet', metric: { label: 'gone quiet', value: String(quiet) } },
    { id: 'sync', name: 'Sync Monitor', dept: 'sales', role: 'Watches devices syncing right now.', watches: ['Devices'], status: online ? `${plural(online, 'person', 'people')} online now` : `${plural(activeToday, 'person', 'people')} today`, metric: { label: 'online', value: String(online) } },
    { id: 'support', name: 'Support Desk', dept: 'ops', role: 'Keeps your notes and follow-ups on each account.', watches: ['Your notes and tasks'], status: openTasks.length ? `${plural(openTasks.length, 'open task')}` : 'No open tasks', metric: { label: 'open tasks', value: String(openTasks.length) } },
    { id: 'security', name: 'Security Watch', dept: 'ops', role: 'Watches lockouts, wrong two-factor codes and two-factor adoption.', watches: ['Lockout counters', 'Two-factor'], status: locked ? `${plural(locked, 'account')} locked out` : `${live.length ? Math.round((twoFa / live.length) * 100) : 0}% use two-factor`, metric: { label: 'with 2FA', value: `${twoFa}/${live.length}` } },
    { id: 'recovery', name: 'Shred Response', dept: 'ops', role: 'Reports vaults destroyed by a security sensor so you can help the owner start over.', watches: ['Incidents'], status: shredded ? `${plural(shredded, 'shredded vault')}` : 'No shredded vaults', metric: { label: 'shredded', value: String(shredded) } },
    { id: 'reviews', name: 'Review Desk', dept: 'marketing', role: 'Queues new reviews for your approval. Approval depends on content, never the rating.', watches: ['Reviews'], status: pending.length ? `${plural(pending.length, 'review')} to approve` : `${raw.reviews.filter((r) => r.status === 'approved').length} approved`, metric: { label: 'waiting', value: String(pending.length) }, needsYou: pending.length },
    { id: 'savings', name: 'Savings Reporter', dept: 'marketing', role: 'Adds up what Shoebox saved people, for the homepage counter.', watches: ['Savings figures'], status: `${fullMoney(savedTotal)} saved for ${ty}`, metric: { label: 'saved', value: money(savedTotal) } },
    { id: 'founders', name: 'Founders Club', dept: 'marketing', role: 'Tracks founding members until the window closes.', watches: ['Join dates'], status: daysToClose > 0 ? `${plural(founders, 'founder')} · ${daysToClose}d left` : `${plural(founders, 'founder')}, window closed`, metric: { label: 'founders', value: String(founders) } },
    { id: 'billing', name: 'Billing', dept: 'finance', role: 'Records Tax Year Pass sales and refunds from Stripe.', watches: ['Passes'], status: passCount ? `${plural(passCount, 'pass', 'passes')} sold` : 'No passes sold yet', metric: { label: 'revenue', value: money(revenue.reduce((s, r) => s + r.amount, 0)) } },
    { id: 'forecaster', name: 'Forecaster', dept: 'finance', role: 'Estimates pass revenue from how engaged each account is.', watches: ['Pipeline'], status: `${money(weighted)} expected for ${ty}`, metric: { label: 'weighted', value: money(weighted) } },
  ]

  const feed: FeedItem[] = [
    ...raw.accounts.map((a) => ({ id: 'j' + a.user_id, agent: 'growth', text: `New sign-up: ${nameOf(a)}${a.founding_no ? `, founding member #${a.founding_no}` : ''}.`, at: a.joined_at, contactId: a.user_id })),
    ...raw.accounts.flatMap((a) => a.passes.map((p) => ({ id: 'p' + a.user_id + p.tax_year, agent: 'billing', text: p.status === 'paid' ? `${nameOf(a)} bought the ${p.tax_year} pass for ${fullMoney(p.amount / 100)}.` : `${nameOf(a)}’s ${p.tax_year} pass was refunded.`, at: p.at, contactId: a.user_id }))),
    ...raw.reviews.map((r) => ({ id: 'r' + r.user_id, agent: 'reviews', text: `${r.display_name} left a ${r.rating}-star review${r.status === 'pending' ? '. It’s waiting for you.' : '.'}`, at: r.updated_at, contactId: r.user_id })),
    ...raw.accounts.flatMap((a) => a.devices.filter((d) => !d.label.startsWith('Foreman') && d.created_at - a.joined_at > 60_000).map((d) => ({ id: 'd' + a.user_id + d.created_at, agent: 'sync', text: `${nameOf(a)} linked a new device: ${d.label}.`, at: d.created_at, contactId: a.user_id }))),
    ...raw.notes.map((n) => ({ id: 'n' + n.id, agent: 'support', text: `${n.author ? n.author.split('@')[0] : 'You'} added a ${n.kind}: “${n.body.slice(0, 60)}${n.body.length > 60 ? '…' : ''}”`, at: n.created_at, contactId: n.user_id })),
    ...accounts.filter((a) => a.shredded && a.incident?.at).map((a) => ({ id: 's' + a.user_id, agent: 'recovery', text: `${nameOf(a)}’s vault was shredded by ${a.incident?.sensor ?? 'a sensor'}.`, at: a.incident!.at!, contactId: a.user_id })),
  ].sort((x, y) => y.at - x.at).slice(0, 40)

  return {
    owner: { name: nameFromEmail(me).split(' ')[0], initials: initials(nameFromEmail(me)) },
    updatedAt: now,
    words: {
      contact: 'account', contacts: 'Accounts', deal: 'pass', deals: 'passes',
      revenueLabel: 'Pass revenue this quarter',
      pipelineSub: 'Every account’s pass for this tax year, by how much they use Shoebox. Stages follow what people do, so cards can’t be dragged.',
      contactsSub: 'Everyone with a Shoebox account, and when they last opened it.',
      pipelineSub2: 'open passes',
      sourceTitle: 'What people use', sourceSub: 'Accounts by their main device',
      leaderboardTitle: 'Most receipts', leaderboardSub: 'Accounts with the most receipts',
      weekTitle: 'Sign-ups this week', weekMetric: 'signups',
    },
    stages: STAGES,
    wonStage: 'won',
    contacts, deals, activities, reviews, revenue, signups, sources, leaderboard,
    heroSide: [
      { label: 'Accounts', value: String(live.length) },
      { label: 'Founding', value: String(founders) },
      { label: 'Passes sold', value: String(passCount) },
    ],
    goalTarget: 1000,
    goals: [
      { id: 'founders', label: 'Founding members', value: founders, target: 100, unit: 'count', initials: 'FM' },
      { id: 'active', label: 'Active today', value: activeToday, target: Math.max(10, live.length), unit: 'count', initials: 'AT' },
      { id: 'reviews', label: 'Approved reviews', value: raw.reviews.filter((r) => r.status === 'approved').length, target: 10, unit: 'count', initials: 'RV' },
      { id: 'twofa', label: 'Using two-factor', value: twoFa, target: Math.max(1, live.length), unit: 'count', initials: '2F' },
      { id: 'passes', label: `${ty} passes`, value: raw.accounts.filter((a) => paid(a).some((p) => p.tax_year === ty)).length, target: Math.max(10, Math.round(live.length * 0.25)), unit: 'count', initials: 'TP' },
    ],
    assist: { title: 'Assist', sub: assist.length ? `${plural(assist.length, 'thing')} could use a look` : 'Nothing needs a look right now', badge: assist.length ? `${assist.length} to check` : undefined, items: assist.slice(0, 6) },
    live: { mode: 'online', title: 'Live now', badge: plural(activeToday, 'today', 'today'), value: String(online), sub: online ? `${plural(online, 'person', 'people')} in Shoebox right now` : 'No one is in Shoebox right now', online },
    nextUp,
    office: {
      depts: { exec: 'Chief of Staff', sales: 'Growth', ops: 'Support & security', marketing: 'Community', finance: 'Billing' },
      board: { title: 'Today at Shoebox', stats: [['Sign-ups', String(signupsToday)], ['Online', String(online)], ['Passes', String(passCount)]] },
      agents, feed,
      note: 'These desks are live monitors over your Shoebox data. They flag things and suggest; they don’t message anyone or change accounts on their own.',
    },
    capabilities: { moveDeals: false, addContacts: false, addDeals: false, notes: true, reviews: true },
  }
}

const STAGES = [
  { id: 'signed', name: 'Signed up', probability: 0.05 },
  { id: 'using', name: 'Adding receipts', probability: 0.15 },
  { id: 'engaged', name: 'Engaged', probability: 0.35 },
  { id: 'power', name: 'Power user', probability: 0.6 },
  { id: 'won', name: 'Pass bought', probability: 1 },
]
const STAGE_P: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s.id, s.probability]))
const labelOf = (k: ActivityKind) => ({ note: 'Note', call: 'Call', email: 'Email', meeting: 'Meeting', task: 'Task', event: 'Event' })[k]

export async function load(b: Business): Promise<Dataset> {
  const s = savedSession(b)
  if (!s) throw new ShoeboxError('session_ended', 'Sign in to Shoebox.')
  try {
    const raw = await rpc<Raw>(b, 'shoebox_admin_snapshot', { p_token: s.token })
    return toDataset(raw, s.email)
  } catch (e) {
    if (e instanceof ShoeboxError && (e.code === 'session_ended' || e.code === 'forbidden')) saveSession(b, null)
    throw e
  }
}

export function actions(b: Business): Actions {
  const tok = () => {
    const s = savedSession(b)
    if (!s) throw new ShoeboxError('session_ended', 'Sign in to Shoebox.')
    return s.token
  }
  const check = (r: { error?: string } | null) => {
    if (r?.error) throw new ShoeboxError('server', r.error === 'invalid' ? 'That isn’t valid.' : 'That account no longer exists.')
  }
  return {
    setReview: async (contactId, status) => check(await rpc(b, 'shoebox_admin_set_review', { p_token: tok(), p_user: contactId, p_status: status })),
    addNote: async (contactId, kind, body, due) => check(await rpc(b, 'shoebox_admin_add_note', { p_token: tok(), p_user: contactId, p_kind: kind, p_body: body, p_due: due })),
    setDone: async (id, done) => check(await rpc(b, 'shoebox_admin_set_note', { p_token: tok(), p_id: id, p_done: done })),
  }
}
