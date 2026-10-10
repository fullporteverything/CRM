import React, { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { agentById } from '../data/agents'
import { branches, firstNames, jobTypes, lastInitials, streets, towns } from '../data/company'
import { adSets, invoices, segments } from '../data/seed'
import type { AdSet, Invoice, Segment } from '../data/seed'

// A small simulation of the agent team. Nothing here talks to a real system:
// a timer picks plausible events and applies their effects to this state.

export type FeedItem = { id: number; agent: string; text: string; at: number; to?: string }
export type Approval = {
  id: string
  agent: string
  title: string
  detail: string
  impact: string
  status: 'open' | 'approved' | 'held'
}
export type Booking = { name: string; town: string; branch: string; when: string; job: string; at: number }

export type State = {
  revived: number
  booked: number
  collected: number
  cpl: number
  feed: FeedItem[]
  approvals: Approval[]
  status: Record<string, { text: string; at: number }>
  paused: string[]
  bookings: Booking[]
  handoffs: { id: number; from: string; to: string }[]
  segments: Segment[]
  adSets: AdSet[]
  invoices: Invoice[]
  nextId: number
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const between = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const person = () => `${pick(firstNames)} ${pick(lastInitials)}`
const address = () => `${between(10, 1400)} ${pick(streets)}`
const slot = () => `${pick(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])} ${pick(['8', '9', '10', '11', '1', '2', '3'])}:${pick(['00', '30'])}`
export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

const approvalPool: Omit<Approval, 'status'>[] = [
  {
    id: 'storm-budget', agent: 'adopt', title: 'Add $60 a day to "Storm repair, search"',
    detail: 'Rain is forecast for Tuesday. Leak searches jump the day after rain, and this ad set books at $62 a lead.',
    impact: 'About 9 more leads this week',
  },
  {
    id: 'sat-inspections', agent: 'scheduler', title: 'Open Saturday inspections in Georgetown',
    detail: 'Eight leads asked for a weekend. Luis has two estimators free on the 18th.',
    impact: '8 inspections that would otherwise wait',
  },
  {
    id: 'reviews', agent: 'reporter', title: 'Ask 22 finished jobs for a Google review',
    detail: 'All 22 paid in full in the last two weeks with no open warranty tickets. Short text in your voice.',
    impact: 'Usually 6 to 9 new reviews',
  },
  {
    id: 'new-creative', agent: 'creative', title: 'Swap in 3 new ads for "Hail damage, broad"',
    detail: 'Built from what leads said on calls this month: "I didn’t know I could still claim it." Frequency on the current ad is 4.6.',
    impact: 'Fresh ads usually cut cost per lead 15 to 25%',
  },
]

const seedApprovals: Approval[] = [
  {
    id: 'text-2023', agent: 'nurture', title: 'Text sequence for 1,870 leads from 2023', status: 'open',
    detail: 'Three texts over nine days, in your voice. Opens with their roof, not an offer. Anyone who replies goes straight to Booker.',
    impact: 'Expect 90 to 140 replies',
  },
  {
    id: 'pause-ads', agent: 'adopt', title: 'Pause 4 ad sets over $95 a lead', status: 'open',
    detail: 'Metal roofing, Hail damage broad, Free inspection carousel and Insurance claim help. $12,200 a month moves to the 55+ replacement and Storm repair ad sets.',
    impact: 'Blended cost per lead drops from $71 to about $58',
  },
  {
    id: 'nudge-marcus', agent: 'nudger', title: 'Nudge Marcus about Round Rock’s 11 cold estimates', status: 'open',
    detail: 'Eleven estimates have had no follow-up for over 72 hours. One text before 8 AM, which is how he likes it.',
    impact: '$148,000 in quotes back in play',
  },
  {
    id: 'remind-invoices', agent: 'invoice', title: 'Remind 4 invoices past 30 days, $23,720', status: 'open',
    detail: 'Two in Round Rock, one in San Marcos and one in Georgetown. A friendly note in your voice with the pay link. The insurance-pending one in Austin North is left alone.',
    impact: 'Clears most of what is late before month end',
  },
]

function seedFeed(now: number): FeedItem[] {
  const items: [string, string, number, string?][] = [
    ['crmwatch', 'CRM Watch caught 3 replies from 2023 leads and passed them to Nurture.', 1, 'nurture'],
    ['booker', 'Booker booked Tanya R. with Austin North for Thursday 9:00 and sent it to Scheduler.', 2, 'scheduler'],
    ['dialer', 'Dialer passed a warm lead to Booker: Glen T. in Cedar Park wants an inspection.', 4, 'booker'],
    ['nudger', 'Nudger heard back from Priya: San Marcos moved 2 of the 3 cold leads.', 7],
    ['forecaster', 'Forecaster updated October cash: $412,000 expected over 30 days.', 9],
    ['invoice', 'Invoice Chaser logged a $2,780 payment for 310 Kestrel Run.', 12],
    ['creative', 'Creative Scout flagged "Insurance claim help" as tired and passed it to Ad Optimizer.', 15, 'adopt'],
    ['scheduler', 'Scheduler moved two Wednesday tear-offs ahead of Tuesday’s rain.', 21],
  ]
  return items.map(([agent, text, mins, to], i) => ({ id: -i - 1, agent, text, at: now - mins * 60_000, to }))
}

function initialState(): State {
  const now = Date.now()
  return {
    revived: 150,
    booked: 34,
    collected: 71580,
    cpl: 71,
    feed: seedFeed(now),
    approvals: seedApprovals,
    status: {},
    paused: [],
    bookings: [
      { name: 'Tanya R.', town: 'Pflugerville', branch: 'Austin North', when: 'Thursday 9:00', job: 'hail damage claim', at: now - 120_000 },
      { name: 'Glen T.', town: 'Cedar Park', branch: 'Austin North', when: 'Friday 10:30', job: 'roof inspection', at: now - 600_000 },
      { name: 'Latoya J.', town: 'Hutto', branch: 'Round Rock', when: 'Thursday 2:00', job: 'full replacement quote', at: now - 1_500_000 },
    ],
    handoffs: [],
    segments,
    adSets,
    invoices,
    nextId: 1,
  }
}

type Effect = Partial<Pick<State, 'revived' | 'booked' | 'collected'>> & { booking?: Booking }
type Draft = { agent: string; text: string; to?: string; effect?: Effect }

function draftEvent(): Draft {
  const who = person()
  const town = pick(towns)
  const branch = pick(branches)
  const options: (() => Draft)[] = [
    () => ({ agent: 'dialer', to: 'booker', text: `Dialer reached ${who} in ${town}. Wants a ${pick(jobTypes)}. Passed to Booker.`, effect: { revived: 1 } }),
    () => {
      const when = slot()
      const job = pick(jobTypes)
      return {
        agent: 'booker', to: 'scheduler',
        text: `Booker booked ${who} with ${branch.name} for ${when} and sent it to Scheduler.`,
        effect: { booked: 1, booking: { name: who, town, branch: branch.name, when, job, at: Date.now() } },
      }
    },
    () => ({ agent: 'nurture', to: 'booker', text: `Nurture got a yes by text from ${who} in ${town} and passed it to Booker.`, effect: { revived: 1 } }),
    () => {
      const n = between(2, 6)
      return { agent: 'crmwatch', to: 'nurture', text: `CRM Watch caught ${n} replies from old leads and passed them to Nurture.`, effect: { revived: n } }
    },
    () => ({ agent: 'sla', to: 'dialer', text: `SLA Monitor flagged a web lead in ${branch.name} waiting ${between(9, 16)} minutes. Dialer called back.` }),
    () => ({ agent: 'scheduler', to: 'invoice', text: `Scheduler marked ${address()} finished and handed it to Invoice Chaser.` }),
    () => ({ agent: 'scheduler', text: `Scheduler moved ${address()} to ${pick(['Thursday', 'Friday', 'Saturday'])} to keep the crew off a wet roof.` }),
    () => ({ agent: 'nudger', text: `Nudger reminded ${branch.manager} about ${between(2, 5)} estimates with no follow-up.` }),
    () => {
      const amt = between(18, 160) * 100
      return { agent: 'invoice', text: `Invoice Chaser logged a ${money(amt)} payment for ${address()}.`, effect: { collected: amt } }
    },
    () => ({ agent: 'adopt', text: `Ad Optimizer shifted $${between(2, 8) * 10} a day toward "Roof replacement, homeowners 55+".` }),
    () => ({ agent: 'creative', to: 'adopt', text: `Creative Scout drafted a new hook from a ${town} call: "${pick(['Is my roof still under warranty?', 'The adjuster missed half of it.', 'We didn’t know hail could do that.'])}"` }),
    () => ({ agent: 'reporter', to: 'chief', text: `Reporter sent the midday numbers for ${branch.name} to Chief of Staff.` }),
    () => ({ agent: 'forecaster', text: `Forecaster nudged October cash up ${money(between(20, 120) * 100)} after today’s bookings.` }),
  ]
  return pick(options)()
}

type Action =
  | { type: 'tick' }
  | { type: 'approve'; id: string }
  | { type: 'hold'; id: string }
  | { type: 'reopen'; id: string }
  | { type: 'approveAll' }
  | { type: 'togglePause'; agent: string }
  | { type: 'clearHandoff'; id: number }

function push(state: State, d: Draft): State {
  const id = state.nextId
  const at = Date.now()
  const e = d.effect ?? {}
  return {
    ...state,
    nextId: id + 1,
    revived: state.revived + (e.revived ?? 0),
    booked: state.booked + (e.booked ?? 0),
    collected: state.collected + (e.collected ?? 0),
    bookings: e.booking ? [e.booking, ...state.bookings].slice(0, 12) : state.bookings,
    feed: [{ id, agent: d.agent, text: d.text, at, to: d.to }, ...state.feed].slice(0, 40),
    status: { ...state.status, [d.agent]: { text: d.text.replace(/^[A-Z][\w ]+? (?=[a-z])/, ''), at } },
    handoffs: d.to ? [...state.handoffs, { id, from: d.agent, to: d.to }] : state.handoffs,
  }
}

// What happens downstream once a decision is approved.
function applyApproval(state: State, a: Approval): State {
  let s = state
  switch (a.id) {
    case 'text-2023':
      s = { ...s, segments: s.segments.map((g) => (g.name.startsWith('2023') ? { ...g, status: 'Running', contacted: 120 } : g)) }
      s = push(s, { agent: 'nurture', to: 'dialer', text: 'Nurture started the 2023 sequence. First 120 texts are out.' })
      break
    case 'pause-ads':
      s = { ...s, cpl: 58, adSets: s.adSets.map((x) => (x.status === 'Flagged' ? { ...x, status: 'Paused' } : x)) }
      s = push(s, { agent: 'adopt', text: 'Ad Optimizer paused 4 ad sets and moved $12,200 a month to the two best performers.' })
      break
    case 'nudge-marcus':
      s = push(s, { agent: 'nudger', text: 'Nudger texted Marcus about Round Rock’s 11 cold estimates.' })
      break
    case 'remind-invoices':
      s = { ...s, invoices: s.invoices.map((i) => (i.status === 'Open' && i.daysOut > 30 ? { ...i, status: 'Reminded' } : i)) }
      s = push(s, { agent: 'invoice', text: 'Invoice Chaser sent 4 reminders with pay links, $23,720 in total.' })
      break
    default:
      s = push(s, { agent: a.agent, text: `${agentById[a.agent].name} started: ${a.title}.` })
  }
  return s
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      let s = state
      const d = draftEvent()
      if (!s.paused.includes(d.agent)) s = push(s, d)
      // Now and then the Chief of Staff brings a new decision.
      const open = s.approvals.filter((a) => a.status === 'open').length
      const unused = approvalPool.filter((p) => !s.approvals.some((a) => a.id === p.id))
      if (open < 3 && unused.length && Math.random() < 0.35) {
        s = { ...s, approvals: [...s.approvals, { ...unused[0], status: 'open' }] }
      }
      return s
    }
    case 'approve': {
      const a = state.approvals.find((x) => x.id === action.id)
      if (!a || a.status === 'approved') return state
      const s = { ...state, approvals: state.approvals.map((x) => (x.id === a.id ? { ...x, status: 'approved' as const } : x)) }
      return applyApproval(s, a)
    }
    case 'approveAll':
      return state.approvals
        .filter((a) => a.status === 'open')
        .reduce((s, a) => reducer(s, { type: 'approve', id: a.id }), state)
    case 'hold':
      return { ...state, approvals: state.approvals.map((x) => (x.id === action.id ? { ...x, status: 'held' } : x)) }
    case 'reopen':
      return { ...state, approvals: state.approvals.map((x) => (x.id === action.id ? { ...x, status: 'open' } : x)) }
    case 'togglePause': {
      const paused = state.paused.includes(action.agent)
        ? state.paused.filter((p) => p !== action.agent)
        : [...state.paused, action.agent]
      return { ...state, paused }
    }
    case 'clearHandoff':
      return { ...state, handoffs: state.handoffs.filter((h) => h.id !== action.id) }
  }
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) dispatch({ type: 'tick' })
    }, 3400)
    return () => clearInterval(t)
  }, [])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside StoreProvider')
  return v
}

export function ago(at: number, now: number) {
  const m = Math.floor((now - at) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)} hr ago`
}

// Re-render every 30s so relative times stay fresh.
export function useNow(every = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}
