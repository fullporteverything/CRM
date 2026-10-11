// Turns any business's Dataset into the numbers each page shows. Nothing here
// knows which business it is; connectors only fill in the Dataset.

import type { Dataset, Deal } from './types'
import { DAY, quarterOf, startOfDay, startOfWeek } from '../lib/format'

export const isWon = (ds: Dataset, d: Deal) => d.stage === ds.wonStage
export const stageOf = (ds: Dataset, id: string) => ds.stages.find((s) => s.id === id)
export const probOf = (ds: Dataset, d: Deal) => d.probability ?? stageOf(ds, d.stage)?.probability ?? 0

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const inRange = (t: number, a: number, b: number) => t >= a && t < b

export function dashboard(ds: Dataset, now: number) {
  const q = quarterOf(now)
  const revQ = sum(ds.revenue.filter((r) => inRange(r.at, q.start, q.end)).map((r) => r.amount))
  const revPrev = sum(ds.revenue.filter((r) => inRange(r.at, q.prevStart, q.start)).map((r) => r.amount))
  const delta = revPrev > 0 ? Math.round(((revQ - revPrev) / revPrev) * 100) : null
  const wonQ = ds.deals.filter((d) => isWon(ds, d) && d.closedAt != null && inRange(d.closedAt, q.start, q.end))
  const allWon = ds.deals.filter((d) => isWon(ds, d))
  const winRate = ds.deals.length ? Math.round((allWon.length / ds.deals.length) * 100) : 0
  const avgDeal = allWon.length ? sum(allWon.map((d) => d.value)) / allWon.length : 0

  const open = ds.deals.filter((d) => !isWon(ds, d))
  const lanes = ds.stages
    .filter((s) => s.id !== ds.wonStage)
    .map((s) => {
      const ds_ = open.filter((d) => d.stage === s.id)
      return { stage: s, count: ds_.length, value: sum(ds_.map((d) => d.value)) }
    })
  const openValue = sum(open.map((d) => d.value))
  const weighted = sum(open.map((d) => d.value * probOf(ds, d)))
  const lanePct = (v: number) => (openValue > 0 ? Math.round((v / openValue) * 100) : 0)

  // This week, Monday to Sunday.
  const w0 = startOfWeek(now)
  const today = startOfDay(now)
  const days = Array.from({ length: 7 }, (_, i) => {
    const a = w0 + i * DAY
    const b = a + DAY
    const value =
      ds.words.weekMetric === 'revenue'
        ? sum(ds.revenue.filter((r) => inRange(r.at, a, b)).map((r) => r.amount))
        : ds.signups.filter((t) => inRange(t, a, b)).length
    return { label: new Date(a).toLocaleDateString('en-US', { weekday: 'short' }), value, today: a === today, future: a > today }
  })
  const weekDone = sum(days.filter((d) => !d.future).map((d) => d.value))
  // Forecast: weighted value of open deals due before the week ends.
  const forecast =
    ds.words.weekMetric === 'revenue'
      ? sum(open.filter((d) => d.due != null && d.due >= today && d.due < w0 + 7 * DAY).map((d) => d.value * probOf(ds, d)))
      : 0

  const hot = [...open]
    .sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || b.value * probOf(ds, b) - a.value * probOf(ds, a))
    .slice(0, 4)

  const goal = ds.goalTarget
  return { q, revQ, revPrev, delta, wonQ, winRate, avgDeal, lanes, lanePct, openValue, weighted, open, days, weekDone, forecast, hot, goal }
}

export type Range = '30d' | '90d' | '12m'

export function reports(ds: Dataset, now: number, range: Range) {
  const span = range === '30d' ? 30 * DAY : range === '90d' ? 90 * DAY : 365 * DAY
  const a = now - span
  const pa = a - span
  const rev = sum(ds.revenue.filter((r) => inRange(r.at, a, now + 1)).map((r) => r.amount))
  const prevRev = sum(ds.revenue.filter((r) => inRange(r.at, pa, a)).map((r) => r.amount))
  const won = ds.deals.filter((d) => isWon(ds, d) && d.closedAt != null && inRange(d.closedAt, a, now + 1))
  const prevWon = ds.deals.filter((d) => isWon(ds, d) && d.closedAt != null && inRange(d.closedAt, pa, a))
  const joinedOf = new Map(ds.contacts.map((c) => [c.id, c.joinedAt]))
  const cycles = won
    .map((d) => {
      const j = d.contactId ? joinedOf.get(d.contactId) : null
      return j && d.closedAt ? Math.max(0, Math.round((d.closedAt - j) / DAY)) : null
    })
    .filter((x): x is number => x != null)
    .sort((x, y) => x - y)
  const cycle = cycles.length ? cycles[Math.floor(cycles.length / 2)] : null
  const created = ds.deals.length
  const conv = created ? (ds.deals.filter((d) => isWon(ds, d)).length / created) * 100 : 0

  // Series: daily for 30d, weekly for 90d, monthly for 12m; the previous period alongside.
  const buckets: { label: string; a: number; b: number }[] = []
  if (range === '12m') {
    const d = new Date(now)
    for (let i = 11; i >= 0; i--) {
      const s = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime()
      const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime()
      buckets.push({ label: new Date(s).toLocaleDateString('en-US', { month: 'short' }), a: s, b: e })
    }
  } else {
    const step = range === '30d' ? 3 * DAY : 7 * DAY
    const n = Math.round(span / step)
    for (let i = n - 1; i >= 0; i--) {
      const e = startOfDay(now) + DAY - i * step
      buckets.push({ label: new Date(e - step).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), a: e - step, b: e })
    }
  }
  const series = buckets.map((k) => ({
    label: k.label,
    cur: sum(ds.revenue.filter((r) => inRange(r.at, k.a, k.b)).map((r) => r.amount)),
    prev: sum(ds.revenue.filter((r) => inRange(r.at, k.a - span, k.b - span)).map((r) => r.amount)),
    signups: ds.signups.filter((t) => inRange(t, k.a, k.b)).length,
  }))

  const order = ds.stages.map((s) => s.id)
  const idx = (st: string) => order.indexOf(st)
  const funnel = ds.stages.map((s, i) => {
    const n = ds.deals.filter((d) => idx(d.stage) >= i).length
    return { label: s.name, count: n, pct: created ? Math.round((n / created) * 100) : 0 }
  })

  const pct = (x: number, y: number) => (y > 0 ? Math.round(((x - y) / y) * 100) : null)
  return {
    rev, prevRev, revDelta: pct(rev, prevRev),
    won: won.length, wonDelta: won.length - prevWon.length,
    cycle, conv,
    series, funnel,
  }
}
