// A CRM kept in this browser: contacts, deals and notes you add yourself.
// Used for a blank business (any business without its own connector yet) and,
// seeded with sample records, for the Kestrel Roofing demo.

import type { Actions, Agent, AssistItem, Business, Contact, Dataset, Deal, Activity, FeedItem, Goal, Stage } from './types'
import { DAY, ago, fullMoney, initials, money, plural, quarterOf, shortDate, startOfDay } from '../lib/format'
import { seedDemo, demoAgents } from './demo'

export type LocalData = {
  v: 1
  owner: string
  reps: { name: string; quota: number }[]
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
}

export const SALES_STAGES: Stage[] = [
  { id: 'lead', name: 'Lead', probability: 0.1 },
  { id: 'qualified', name: 'Qualified', probability: 0.3 },
  { id: 'proposal', name: 'Proposal', probability: 0.55 },
  { id: 'negotiation', name: 'Negotiation', probability: 0.75 },
  { id: 'won', name: 'Won', probability: 1 },
]

const key = (b: Business) => `foreman:local:${b.id}`

export function readLocal(b: Business): LocalData {
  try {
    const s = localStorage.getItem(key(b))
    if (s) return JSON.parse(s) as LocalData
  } catch { /* blocked or corrupt: start over */ }
  const fresh: LocalData = b.connector === 'demo' ? seedDemo(Date.now()) : { v: 1, owner: b.config?.owner || 'You', reps: [{ name: b.config?.owner || 'You', quota: 50_000 }], contacts: [], deals: [], activities: [] }
  writeLocal(b, fresh)
  return fresh
}

function writeLocal(b: Business, d: LocalData) {
  try {
    localStorage.setItem(key(b), JSON.stringify(d))
  } catch { /* storage full or blocked: changes last until reload */ }
  memo.set(b.id, d)
}
const memo = new Map<string, LocalData>()
const get = (b: Business) => memo.get(b.id) ?? readLocal(b)

export function resetLocal(b: Business) {
  try { localStorage.removeItem(key(b)) } catch { /* blocked */ }
  memo.delete(b.id)
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function actions(b: Business): Actions {
  const mut = async (f: (d: LocalData) => void) => {
    const d = structuredClone(get(b))
    f(d)
    writeLocal(b, d)
  }
  return {
    moveDeal: (id, stage) => mut((d) => {
      const deal = d.deals.find((x) => x.id === id)
      if (!deal || deal.stage === stage) return
      const from = deal.stage
      deal.stage = stage
      deal.closedAt = stage === 'won' ? Date.now() : null
      const name = SALES_STAGES.find((s) => s.id === stage)?.name ?? stage
      d.activities.unshift({ id: uid(), contactId: deal.contactId, kind: 'event', title: stage === 'won' ? `Won: ${deal.title}` : `${deal.title} moved to ${name}`, body: `From ${SALES_STAGES.find((s) => s.id === from)?.name ?? from} · ${fullMoney(deal.value)}`, at: Date.now() })
      const c = d.contacts.find((x) => x.id === deal.contactId)
      if (c) {
        c.lastTouch = Date.now()
        if (stage === 'won') { c.status = 'customer'; c.value += deal.value }
      }
    }),
    addContact: (c) => mut((d) => {
      const id = uid()
      d.contacts.unshift({ id, name: c.name.trim(), email: c.email.trim(), company: c.company.trim(), status: 'lead', value: 0, lastTouch: Date.now(), joinedAt: Date.now(), facts: [], source: 'Added by hand' })
      d.activities.unshift({ id: uid(), contactId: id, kind: 'event', title: 'Added as a contact', at: Date.now() })
    }),
    addDeal: (x) => mut((d) => {
      d.deals.unshift({ id: uid(), contactId: x.contactId, company: x.company, title: x.title, value: x.value, stage: x.stage, due: x.due, owner: initials(d.owner), closedAt: x.stage === 'won' ? Date.now() : null })
    }),
    addNote: (contactId, kind, body, due) => mut((d) => {
      d.activities.unshift({ id: uid(), contactId, kind, title: kind === 'task' ? body.split('\n')[0] : kind[0].toUpperCase() + kind.slice(1), body: kind === 'task' ? body.split('\n').slice(1).join('\n') : body, at: Date.now(), due, done: false, author: d.owner })
      const c = d.contacts.find((x) => x.id === contactId)
      if (c) c.lastTouch = Date.now()
    }),
    setDone: (id, done) => mut((d) => {
      const a = d.activities.find((x) => x.id === id)
      if (a) a.done = done
    }),
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const SOURCE_COLORS = ['#3fb3b0', '#4f8df0', '#e8a948', '#3fcf8e', '#c27bd6', '#ef5b5b']

export function load(b: Business): Dataset {
  const d = get(b)
  const now = Date.now()
  const q = quarterOf(now)
  const won = d.deals.filter((x) => x.stage === 'won')
  const open = d.deals.filter((x) => x.stage !== 'won')
  const revenue = won.filter((x) => x.closedAt).map((x) => ({ at: x.closedAt!, amount: x.value, contactId: x.contactId, label: x.title }))
  const sourceCount = new Map<string, number>()
  for (const x of won) {
    const c = d.contacts.find((y) => y.id === x.contactId)
    const s = c?.source ?? 'Other'
    sourceCount.set(s, (sourceCount.get(s) ?? 0) + x.value)
  }
  const sources = [...sourceCount.entries()].sort((x, y) => y[1] - x[1]).map(([label, value], i) => ({ label, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))

  const repWon = (name: string, from = 0) => sum(won.filter((x) => x.owner === initials(name) && (x.closedAt ?? 0) >= from).map((x) => x.value))
  const leaderboard = [...d.reps]
    .map((r) => ({ name: r.name, sub: plural(won.filter((x) => x.owner === initials(r.name)).length, 'deal') + ' won', value: repWon(r.name), unit: 'money' as const }))
    .sort((x, y) => y.value - x.value)
  const goals: Goal[] = d.reps.map((r) => ({ id: r.name, label: r.name, value: repWon(r.name, q.start), target: r.quota, unit: 'money', initials: initials(r.name), you: r.name === d.owner }))

  const overdue = open.filter((x) => x.due != null && x.due < now)
  const stale = open.filter((x) => {
    const c = d.contacts.find((y) => y.id === x.contactId)
    return c?.lastTouch != null && now - c.lastTouch > 14 * DAY
  })
  const atRisk = [...new Map([...overdue, ...stale].map((x) => [x.id, x])).values()]
  const assist: AssistItem[] = atRisk.slice(0, 5).map((x) => ({
    id: x.id, title: x.company, sub: x.due != null && x.due < now ? `${ago(x.due, now).replace(' ago', '')} past its close date` : `No contact in ${Math.round((now - (d.contacts.find((y) => y.id === x.contactId)?.lastTouch ?? now)) / DAY)} days`,
    value: money(x.value), tone: x.due != null && x.due < now ? 'bad' : 'warn', contactId: x.contactId, to: 'pipeline',
  }))

  const upcoming = d.activities.filter((a) => (a.kind === 'meeting' || a.kind === 'call' || a.kind === 'task') && !a.done && a.due != null && a.due > now - 2 * 3600_000).sort((x, y) => x.due! - y.due!)
  const nx = upcoming[0]
  const nextUp: Dataset['nextUp'] = nx
    ? { title: nx.title, when: `${startOfDay(nx.due!) === startOfDay(now) ? 'Today' : shortDate(nx.due!)} · ${new Date(nx.due!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${d.contacts.find((c) => c.id === nx.contactId)?.name ?? ''}`, badge: startOfDay(nx.due!) === startOfDay(now) ? 'Today' : 'Upcoming', action: { label: nx.kind === 'task' ? 'Open contact' : 'Join call', to: 'contact', contactId: nx.contactId } }
    : null

  const demo = b.connector === 'demo'
  const agents: Agent[] = demo ? demoAgents(d, now) : genericAgents(d, now, atRisk.length, upcoming.length)
  const feed: FeedItem[] = d.activities.slice(0, 30).map((a) => ({
    id: a.id, agent: a.kind === 'event' ? (a.title.startsWith('Won') ? 'forecaster' : 'crmwatch') : a.kind === 'meeting' ? 'booker' : 'nurture', text: `${a.title}${a.body ? ': ' + a.body.split('\n')[0] : ''}`, at: a.at, contactId: a.contactId,
  }))
  const signups = d.contacts.map((c) => c.joinedAt ?? 0).filter(Boolean)
  const wonQ = won.filter((x) => (x.closedAt ?? 0) >= q.start)

  return {
    owner: { name: d.owner.split(' ')[0], initials: initials(d.owner) },
    updatedAt: now,
    words: {
      contact: 'contact', contacts: 'Contacts', deal: 'deal', deals: 'deals',
      revenueLabel: 'Revenue won this quarter',
      pipelineSub: 'Drag a deal to move it a stage. Every number follows.',
      contactsSub: 'Everyone you sell to, and when you last spoke.',
      pipelineSub2: 'deals',
      sourceTitle: 'Where deals come from', sourceSub: 'Share of revenue won',
      leaderboardTitle: 'Leaderboard', leaderboardSub: 'Revenue won, all time',
      weekTitle: 'Revenue this week', weekMetric: 'revenue',
    },
    stages: SALES_STAGES,
    wonStage: 'won',
    contacts: d.contacts, deals: d.deals, activities: d.activities, reviews: [],
    revenue, signups, sources, leaderboard,
    heroSide: [],
    goalTarget: sum(d.reps.map((r) => r.quota)),
    goals,
    assist: { title: 'Assist', sub: atRisk.length ? `${money(sum(atRisk.map((x) => x.value)))} could slip this month` : 'Nothing is slipping', badge: atRisk.length ? `${atRisk.length} at risk` : undefined, items: assist },
    live: { mode: 'timer', title: 'Call session', badge: plural(d.activities.filter((a) => a.kind === 'call' && a.at >= startOfDay(now)).length, 'call'), value: '', sub: 'Time on calls today', online: 0 },
    nextUp,
    office: {
      depts: demo ? { exec: 'Chief of Staff', sales: 'Sales & revival', ops: 'Branch ops', marketing: 'Marketing', finance: 'Finance' } : { exec: 'Chief of Staff', sales: 'Sales', ops: 'Follow-ups', marketing: 'Marketing', finance: 'Finance' },
      board: { title: `Today at ${b.name}`, stats: [['Open deals', String(open.length)], ['Won this Q', String(wonQ.length)], ['Revenue', money(sum(wonQ.map((x) => x.value)))]] },
      agents, feed,
      note: demo ? 'Sample business with made-up records. Drag deals and add notes freely; Settings can reset it.' : 'These desks watch the records you keep here and flag what needs you.',
    },
    capabilities: { moveDeals: true, addContacts: true, addDeals: true, notes: true, reviews: false },
    notice: demo ? 'Sample data. Kestrel Roofing and everyone in it are made up.' : undefined,
  }
}

function genericAgents(d: LocalData, now: number, atRisk: number, upcoming: number): Agent[] {
  const open = d.deals.filter((x) => x.stage !== 'won')
  const weighted = sum(open.map((x) => x.value * (SALES_STAGES.find((s) => s.id === x.stage)?.probability ?? 0)))
  const tasks = d.activities.filter((a) => a.kind === 'task' && !a.done).length
  const newLeads = d.contacts.filter((c) => (c.joinedAt ?? 0) > now - 7 * DAY).length
  const quiet = d.contacts.filter((c) => c.lastTouch && now - c.lastTouch > 30 * DAY).length
  const won = d.deals.filter((x) => x.stage === 'won')
  const mk = (id: string, name: string, dept: Agent['dept'], role: string, status: string, label: string, value: string, needsYou = 0): Agent => ({ id, name, dept, role, status, metric: { label, value }, watches: [], needsYou })
  return [
    mk('chief', 'Chief of Staff', 'exec', 'Reads every desk and brings you what needs a person.', atRisk + tasks ? `${plural(atRisk + tasks, 'thing')} need you` : 'Nothing needs you', 'need you', String(atRisk + tasks), atRisk + tasks),
    mk('dialer', 'Lead Desk', 'sales', 'Counts new contacts this week.', `${plural(newLeads, 'new contact')} this week`, 'this week', String(newLeads)),
    mk('nurture', 'Nurture', 'sales', 'Finds contacts you haven’t spoken to in a month.', quiet ? `${plural(quiet, 'contact')} gone quiet` : 'Everyone heard from you', 'quiet', String(quiet)),
    mk('booker', 'Scheduler', 'sales', 'Lines up your calls and meetings.', upcoming ? `${plural(upcoming, 'meeting')} coming up` : 'Calendar is clear', 'upcoming', String(upcoming)),
    mk('crmwatch', 'CRM Watch', 'sales', 'Keeps every stage change and note in the timeline.', `${plural(d.activities.length, 'entry', 'entries')} logged`, 'logged', String(d.activities.length)),
    mk('scheduler', 'Task Keeper', 'ops', 'Tracks the follow-ups you owe.', tasks ? `${plural(tasks, 'open task')}` : 'No open tasks', 'open', String(tasks)),
    mk('sla', 'Deal Watch', 'ops', 'Flags deals past their close date or gone cold.', atRisk ? `${plural(atRisk, 'deal')} at risk` : 'Nothing at risk', 'at risk', String(atRisk)),
    mk('nudger', 'Nudger', 'ops', 'Reminds you about stale proposals.', `${open.filter((x) => x.stage === 'proposal').length} proposals out`, 'proposals', String(open.filter((x) => x.stage === 'proposal').length)),
    mk('adopt', 'Source Tracker', 'marketing', 'Tallies where your won deals came from.', `${new Set(d.contacts.map((c) => c.source)).size} sources`, 'sources', String(new Set(d.contacts.map((c) => c.source)).size)),
    mk('creative', 'Reporter', 'marketing', 'Builds your reports page.', 'Reports are current', 'reports', '4'),
    mk('reporter', 'Win Scout', 'marketing', 'Notices which deals close fastest.', `${won.length} won so far`, 'won', String(won.length)),
    mk('invoice', 'Revenue', 'finance', 'Adds up won deals.', `${fullMoney(sum(won.map((x) => x.value)))} won`, 'won', money(sum(won.map((x) => x.value)))),
    mk('forecaster', 'Forecaster', 'finance', 'Weights open deals by stage.', `${money(weighted)} weighted`, 'weighted', money(weighted)),
  ]
}
