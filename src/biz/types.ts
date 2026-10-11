// The shape every business is turned into. A connector (shoebox.ts, demo.ts,
// local.ts) reads its own source and returns a Dataset; derive.ts turns any
// Dataset into the dashboard, pipeline, contacts and reports views. To plug in
// a new business, write a connector that returns a Dataset.

export type DeptId = 'exec' | 'sales' | 'ops' | 'marketing' | 'finance'

export type Stage = { id: string; name: string; probability: number }

export type ContactStatus = 'customer' | 'active' | 'lead' | 'at_risk' | 'locked' | 'closed'

export type Device = { label: string; lastSeen: number | null; createdAt: number | null; revoked: boolean }

export type Review = {
  contactId: string
  rating: number
  body: string
  name: string
  role: string
  status: 'pending' | 'approved' | 'rejected'
  at: number
}

export type Contact = {
  id: string
  name: string
  email: string
  company: string // or plan, for a consumer product
  status: ContactStatus
  value: number // lifetime value in dollars
  lastTouch: number | null
  joinedAt: number | null
  facts: { label: string; value: string }[]
  devices?: Device[]
  tags?: string[]
  source?: string
}

export type Deal = {
  id: string
  contactId: string | null
  company: string
  title: string
  value: number
  stage: string
  probability?: number // overrides the stage's
  due: number | null
  hot?: boolean
  owner?: string // initials
  closedAt?: number | null
}

export type ActivityKind = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'event'

export type Activity = {
  id: string
  contactId: string | null
  kind: ActivityKind
  title: string
  body?: string
  at: number
  due?: number | null
  done?: boolean
  author?: string
}

export type Money = { at: number; amount: number; contactId?: string | null; label?: string }

export type Agent = {
  id: string
  name: string
  dept: DeptId
  role: string
  status: string
  metric: { label: string; value: string }
  watches: string[]
  needsYou?: number
}

export type FeedItem = { id: string; agent: string; text: string; at: number; contactId?: string | null }

export type AssistItem = { id: string; title: string; sub: string; value?: string; tone: 'bad' | 'warn' | 'accent'; contactId?: string | null; to?: string }

export type Goal = { id: string; label: string; value: number; target: number; unit: 'money' | 'count'; initials?: string; you?: boolean }

export type Capabilities = {
  moveDeals: boolean
  addContacts: boolean
  addDeals: boolean
  notes: boolean
  reviews: boolean
}

export type Dataset = {
  owner: { name: string; initials: string }
  updatedAt: number
  words: {
    contact: string // "contact", "account"
    contacts: string
    deal: string // "deal", "pass"
    deals: string
    revenueLabel: string // "Revenue won this quarter"
    pipelineSub: string
    contactsSub: string
    pipelineSub2: string
    sourceTitle: string // "Where deals come from"
    sourceSub: string
    leaderboardTitle: string
    leaderboardSub: string
    weekTitle: string
    weekMetric: 'revenue' | 'signups'
  }
  stages: Stage[]
  wonStage: string
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  reviews: Review[]
  revenue: Money[]
  signups: number[] // join times
  sources: { label: string; value: number; color: string }[]
  leaderboard: { name: string; sub: string; value: number; unit: 'money' | 'count' | 'savings'; contactId?: string | null }[]
  heroSide: { label: string; value: string }[]
  goalTarget: number // dollars per quarter
  goals: Goal[]
  assist: { title: string; sub: string; badge?: string; items: AssistItem[] }
  live: { mode: 'online' | 'timer'; title: string; badge: string; value: string; sub: string; online: number }
  nextUp: { title: string; when: string; badge: string; action?: { label: string; to: string; contactId?: string | null } } | null
  office: {
    depts: Record<DeptId, string>
    board: { title: string; stats: [string, string][] }
    agents: Agent[]
    feed: FeedItem[]
    note: string
  }
  capabilities: Capabilities
  notice?: string
}

export type Connector = 'shoebox' | 'demo' | 'local'

export type Business = {
  id: string
  name: string
  connector: Connector
  color: string
  createdAt: number
  config?: Record<string, string>
}

export type Actions = {
  setReview?: (contactId: string, status: Review['status']) => Promise<void>
  addNote?: (contactId: string, kind: ActivityKind, body: string, due: number | null) => Promise<void>
  setDone?: (activityId: string, done: boolean) => Promise<void>
  moveDeal?: (dealId: string, stage: string) => Promise<void>
  addContact?: (c: { name: string; email: string; company: string }) => Promise<void>
  addDeal?: (d: { title: string; company: string; value: number; stage: string; contactId: string | null; due: number | null }) => Promise<void>
}
