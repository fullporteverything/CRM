// Sample records for the Kestrel Roofing demo business. Everything here is
// made up; a seeded random generator keeps it the same on every load.

import type { Activity, Agent, Contact, Deal } from './types'
import type { LocalData } from './local'
import { agents as roster } from '../data/agents'
import { branches, firstNames, jobTypes, streets, towns } from '../data/company'
import { DAY, initials, startOfWeek } from '../lib/format'

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lastNames = ['Ramirez', 'Mitchell', 'Johnson', 'Tran', 'Alvarez', 'Kim', 'Walker', 'Simmons', 'Patel', 'Dawson', 'Lopez', 'Hughes', 'Nguyen', 'Brooks', 'Reyes', 'Carter']
const commercial = ['Live Oak Apartments', 'Mesquite Plaza HOA', 'Hill Country Self Storage', 'Brushy Creek Church', 'Caliche Dental Group', 'Pecan Street Lofts']
const sources = ['Referral', 'Google Ads', 'Storm canvassing', 'Website', 'Repeat customer']

export function seedDemo(now: number): LocalData {
  const r = rng(20111)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
  const between = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const reps = [
    { name: 'Sam Kessler', quota: 180_000 },
    ...branches.map((b) => ({ name: b.manager, quota: Math.round(b.revenueMonth * 0.12 / 1000) * 1000 })),
  ]
  const contacts: Contact[] = []
  const deals: Deal[] = []
  const activities: Activity[] = []
  let n = 0
  const id = () => `k${(n++).toString(36)}`

  const makeContact = (isCo: boolean, joinedAt: number): Contact => {
    const first = pick(firstNames)
    const last = pick(lastNames)
    const town = pick(towns)
    const co = isCo ? pick(commercial) : `${between(10, 1400)} ${pick(streets)}, ${town}`
    const name = `${first} ${last}`
    return {
      id: id(), name, email: `${first.toLowerCase()}.${last.toLowerCase()}@${isCo ? co.toLowerCase().replace(/[^a-z]+/g, '') + '.com' : 'gmail.com'}`,
      company: co, status: 'lead', value: 0, lastTouch: joinedAt, joinedAt, source: pick(sources),
      facts: [{ label: 'Town', value: town }, { label: 'Branch', value: pick(branches).name }, { label: 'Roof', value: pick(['Asphalt shingle', 'Standing seam metal', 'Tile', 'TPO (flat)']) }],
    }
  }
  const titleFor = (isCo: boolean) => isCo ? pick(['Commercial re-roof', 'TPO overlay, 3 buildings', 'Annual maintenance plan', 'Storm damage, insurance claim']) : `${pick(jobTypes).replace(/^\w/, (c) => c.toUpperCase())}`
  const valueFor = (isCo: boolean, title: string) =>
    isCo ? between(38, 126) * 1000 : /replacement|metal/.test(title) ? between(92, 290) * 100 : /hail|claim/.test(title) ? between(110, 240) * 100 : between(6, 38) * 100

  // Won jobs over the last 13 months, for the reports.
  const qStart = new Date(new Date(now).getFullYear(), Math.floor(new Date(now).getMonth() / 3) * 3, 1).getTime()
  const weekStart = startOfWeek(now)
  for (let i = 0; i < 52; i++) {
    // A few wins this week and this quarter, so the dashboard has a story; the rest over the past year.
    const closedAt = i < 4 ? weekStart + r() * Math.max(3600_000, now - weekStart - 3600_000)
      : i < 15 ? qStart + r() * (now - qStart)
      : now - between(12, 395) * DAY - between(0, 20) * 3600_000
    const isCo = r() < 0.18
    const c = makeContact(isCo, closedAt - between(9, 60) * DAY)
    const title = titleFor(isCo)
    const value = valueFor(isCo, title)
    c.status = 'customer'
    c.value = value
    c.lastTouch = Math.min(now - 3600_000, closedAt + between(0, 20) * DAY)
    contacts.push(c)
    const owner = pick(reps)
    deals.push({ id: id(), contactId: c.id, company: isCo ? c.company : c.name, title, value, stage: 'won', due: closedAt, closedAt, owner: initials(owner.name) })
  }
  // Open pipeline.
  const stages: [string, number][] = [['lead', 3], ['qualified', 4], ['proposal', 5], ['negotiation', 3]]
  for (const [stage, count] of stages) {
    for (let i = 0; i < count; i++) {
      const isCo = r() < 0.3
      const c = makeContact(isCo, now - between(2, 40) * DAY)
      const title = titleFor(isCo)
      c.status = r() < 0.15 ? 'at_risk' : 'active'
      c.lastTouch = now - (c.status === 'at_risk' ? between(16, 30) : between(0, 9)) * DAY
      contacts.push(c)
      const owner = pick(reps)
      deals.push({ id: id(), contactId: c.id, company: isCo ? c.company : c.name, title, value: valueFor(isCo, title), stage, due: now + between(-4, 34) * DAY, hot: r() < 0.3, owner: initials(owner.name) })
    }
  }
  // A few leads without deals yet.
  for (let i = 0; i < 6; i++) contacts.push(makeContact(false, now - between(0, 6) * DAY))

  // Timeline.
  for (const c of contacts.slice(-24)) {
    activities.push({ id: id(), contactId: c.id, kind: 'event', title: 'Lead came in', body: `From ${c.source}`, at: c.joinedAt! })
    if (r() < 0.7) activities.push({ id: id(), contactId: c.id, kind: pick(['call', 'note', 'email'] as const), title: pick(['Call', 'Note', 'Email']), body: pick(['Walked the roof with them. Two soft spots by the chimney.', 'Sent the estimate and the financing sheet.', 'Insurance adjuster comes Thursday.', 'Wants metal but worried about price. Send the 30-year comparison.', 'Left a voicemail.']), at: c.lastTouch!, author: 'Sam Kessler' })
  }
  const open = deals.filter((d) => d.stage !== 'won')
  const today = new Date(now)
  const at = (h: number, m: number, dd = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + dd, h, m).getTime()
  const nx = open.find((d) => d.stage === 'negotiation') ?? open[0]
  const nextC = contacts.find((c) => c.id === nx?.contactId)
  activities.push({ id: id(), contactId: nextC?.id ?? null, kind: 'meeting', title: `Estimate walk-through with ${nextC?.name.split(' ')[0] ?? 'a customer'}`, body: nx?.title, at: now - 2 * DAY, due: today.getHours() < 17 ? at(17, 30) : at(9, 30, 1), done: false, author: 'Sam Kessler' })
  activities.push({ id: id(), contactId: open[1]?.contactId ?? null, kind: 'task', title: 'Send the revised quote', body: 'With the gutter add-on.', at: now - DAY, due: at(12, 0, 1), done: false, author: 'Sam Kessler' })
  activities.push({ id: id(), contactId: open[2]?.contactId ?? null, kind: 'call', title: 'Call', body: 'Confirmed the crew date.', at: now - 3 * 3600_000, author: 'Sam Kessler' })
  activities.sort((a, b) => b.at - a.at)
  contacts.sort((a, b) => (b.lastTouch ?? 0) - (a.lastTouch ?? 0))
  return { v: 1, owner: 'Sam Kessler', reps, contacts, deals, activities }
}

export function demoAgents(d: LocalData, now: number): Agent[] {
  const tick = Math.floor(now / 9000)
  return roster.map((a, i) => ({
    id: a.id, name: a.name, dept: a.dept, role: a.role, watches: a.reads,
    status: a.idle[(tick + i) % a.idle.length],
    metric: { label: a.metric.label, value: a.metric.unit === '$' ? `$${a.metric.value.toLocaleString('en-US')}` : `${a.metric.value}${a.metric.unit ? ' ' + a.metric.unit : ''}` },
    needsYou: a.id === 'chief' ? d.activities.filter((x) => x.kind === 'task' && !x.done).length : 0,
  }))
}
