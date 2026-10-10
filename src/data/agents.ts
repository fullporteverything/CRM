export type DeptId = 'exec' | 'sales' | 'ops' | 'marketing' | 'finance'

export const departments: Record<DeptId, { name: string; color: string }> = {
  exec: { name: 'Chief of Staff', color: 'var(--dept-exec)' },
  sales: { name: 'Sales & revival', color: 'var(--dept-sales)' },
  ops: { name: 'Branch ops', color: 'var(--dept-ops)' },
  marketing: { name: 'Marketing', color: 'var(--dept-marketing)' },
  finance: { name: 'Finance', color: 'var(--dept-finance)' },
}

export type ShelfId = 'leads' | 'jobs' | 'branches' | 'voice' | 'pricing' | 'decisions' | 'ads'

export type Agent = {
  id: string
  name: string
  dept: DeptId
  role: string
  reads: ShelfId[]
  desk: { x: number; y: number }
  metric: { label: string; value: number; unit?: string }
  idle: string[]
}

export const agents: Agent[] = [
  {
    id: 'chief', name: 'Chief of Staff', dept: 'exec',
    role: 'Watches every agent, writes your brief, and brings you the decisions that need a person.',
    reads: ['decisions', 'branches', 'leads', 'jobs', 'ads'],
    desk: { x: 9.6, y: 1.3 },
    metric: { label: 'decisions prepared', value: 9 },
    idle: ['Waiting on you', 'Drafting the noon brief', 'Reviewing approvals'],
  },
  {
    id: 'dialer', name: 'Dialer', dept: 'sales',
    role: 'Calls new web leads within two minutes and works call-back lists from old leads.',
    reads: ['leads', 'voice', 'branches'],
    desk: { x: 14.2, y: 6.0 },
    metric: { label: 'calls today', value: 186 },
    idle: ['On a call', 'Calling 2024 lost quotes', 'Leaving a voicemail'],
  },
  {
    id: 'nurture', name: 'Nurture', dept: 'sales',
    role: 'Texts and emails dormant leads in your voice until they reply or opt out.',
    reads: ['leads', 'voice', 'pricing'],
    desk: { x: 14.2, y: 8.8 },
    metric: { label: 'replies today', value: 41 },
    idle: ['Writing follow-ups', 'Texting hail-season leads', '3 replies in queue'],
  },
  {
    id: 'booker', name: 'Booker', dept: 'sales',
    role: 'Turns warm replies into booked inspections on the right branch calendar.',
    reads: ['leads', 'branches', 'jobs'],
    desk: { x: 17.4, y: 6.0 },
    metric: { label: 'inspections booked', value: 23 },
    idle: ['Checking calendars', 'Confirming Thursday slots', 'Booking Leander'],
  },
  {
    id: 'crmwatch', name: 'CRM Watch', dept: 'sales',
    role: 'Logs every call, text and outcome back into the CRM so nothing is lost.',
    reads: ['leads', 'jobs'],
    desk: { x: 17.4, y: 8.8 },
    metric: { label: 'outcomes logged', value: 512 },
    idle: ['Logging outcomes', 'Merging duplicate leads', 'Tagging storm leads'],
  },
  {
    id: 'scheduler', name: 'Scheduler', dept: 'ops',
    role: 'Builds crew schedules around weather, materials and inspection times.',
    reads: ['jobs', 'branches'],
    desk: { x: 1.6, y: 3.8 },
    metric: { label: 'jobs scheduled', value: 17 },
    idle: ['Watching the radar', 'Balancing crews', 'Moving Wednesday jobs'],
  },
  {
    id: 'sla', name: 'SLA Monitor', dept: 'ops',
    role: 'Times every lead and estimate, and escalates anything sitting too long.',
    reads: ['leads', 'branches'],
    desk: { x: 4.4, y: 3.8 },
    metric: { label: 'median speed to lead', value: 6, unit: 'min' },
    idle: ['All leads under 15 min', 'Timing Round Rock', 'Checking estimates'],
  },
  {
    id: 'nudger', name: 'Nudger', dept: 'ops',
    role: 'Reminds branch managers and estimators about the follow-ups they owe.',
    reads: ['branches', 'voice', 'jobs'],
    desk: { x: 3.0, y: 6.8 },
    metric: { label: 'nudges sent', value: 14 },
    idle: ['Waiting for Marcus', 'Drafting nudges', 'Checking cold estimates'],
  },
  {
    id: 'adopt', name: 'Ad Optimizer', dept: 'marketing',
    role: 'Moves budget toward the ad sets that book inspections, not just clicks.',
    reads: ['ads', 'leads', 'decisions'],
    desk: { x: 13.8, y: 12.4 },
    metric: { label: 'blended cost per lead', value: 71, unit: '$' },
    idle: ['Comparing ad sets', 'Watching cost per lead', 'Waiting on you'],
  },
  {
    id: 'creative', name: 'Creative Scout', dept: 'marketing',
    role: 'Spots tired ads and drafts new angles from what your best leads say.',
    reads: ['ads', 'voice', 'leads'],
    desk: { x: 16.6, y: 12.4 },
    metric: { label: 'ads flagged tired', value: 3 },
    idle: ['Reading call transcripts', 'Drafting new hooks', 'Checking frequency'],
  },
  {
    id: 'reporter', name: 'Reporter', dept: 'marketing',
    role: 'Writes the daily numbers for each branch and the weekly owner report.',
    reads: ['decisions', 'branches', 'ads', 'jobs'],
    desk: { x: 19.4, y: 12.4 },
    metric: { label: 'reports sent', value: 5 },
    idle: ['Building the midday report', 'Pulling branch numbers', 'Charting the week'],
  },
  {
    id: 'invoice', name: 'Invoice Chaser', dept: 'finance',
    role: 'Sends friendly payment reminders with a pay link and logs what comes in.',
    reads: ['jobs', 'voice', 'decisions'],
    desk: { x: 6.8, y: 12.2 },
    metric: { label: 'collected today', value: 71580, unit: '$' },
    idle: ['Matching payments', 'Waiting on you', 'Checking insurance checks'],
  },
  {
    id: 'forecaster', name: 'Forecaster', dept: 'finance',
    role: 'Projects cash and revenue from the pipeline, the schedule and open invoices.',
    reads: ['jobs', 'pricing', 'branches'],
    desk: { x: 9.6, y: 12.2 },
    metric: { label: 'October cash forecast', value: 412000, unit: '$' },
    idle: ['Updating October', 'Running the pipeline', 'Checking material costs'],
  },
]

export const agentById = Object.fromEntries(agents.map((a) => [a.id, a])) as Record<string, Agent>

export type Shelf = { id: ShelfId; name: string; memories: number; snippets: { text: string; source: string }[] }

export const shelves: Shelf[] = [
  {
    id: 'leads', name: 'Leads', memories: 47300,
    snippets: [
      { text: 'Hail leads from April 2025 reply best on weekday evenings, 6 to 8 PM.', source: 'Leads · from 5,100 texts' },
      { text: 'Lost quotes usually lost on timing, not price. Lead with "we can start next week".', source: 'Leads · call recordings' },
      { text: 'Leads that mention insurance want the adjuster meeting booked first.', source: 'Leads · 812 calls' },
    ],
  },
  {
    id: 'jobs', name: 'Jobs and estimates', memories: 6840,
    snippets: [
      { text: 'Average tear-off and replacement runs 1.6 crew days. Metal adds a day.', source: 'Jobs · 2,140 finished jobs' },
      { text: 'Estimates not followed up in 72 hours close at less than half the rate.', source: 'Jobs · estimate history' },
    ],
  },
  {
    id: 'branches', name: 'Branches', memories: 3120,
    snippets: [
      { text: 'San Marcos has two estimators out until October 20. Overflow books into Austin North.', source: 'Branches · Priya, by text' },
      { text: 'Round Rock has the most leads after Austin and four crews. Marcus prefers nudges before 8 AM.', source: 'Branches · Marcus, by email' },
      { text: 'Georgetown runs Saturday inspections twice a month.', source: 'Branches · branch calendar' },
    ],
  },
  {
    id: 'voice', name: 'Your voice', memories: 6213,
    snippets: [
      { text: 'Short and direct. Open with the roof, not the offer. No hard sell.', source: 'Your voice · 214 sent emails' },
      { text: 'Sign off with your first name only. No exclamation marks.', source: 'Your voice · sent email' },
      { text: 'Call people by first name. Mention the street when you know it.', source: 'Your voice · 286 voice samples' },
    ],
  },
  {
    id: 'pricing', name: 'Pricing and offers', memories: 412,
    snippets: [
      { text: 'Architectural shingle replacement averages $14,200. Metal averages $26,800.', source: 'Pricing · last 12 months' },
      { text: 'Free inspection is always on. Never discount below 8% without you.', source: 'Pricing · your rule' },
    ],
  },
  {
    id: 'decisions', name: 'Decisions', memories: 1412,
    snippets: [
      { text: 'You approved pausing any ad set over $95 a lead for more than 5 days.', source: 'Decisions · Sept 18' },
      { text: 'You held a 1,200-lead text blast once because it went out on a Sunday.', source: 'Decisions · Aug 3' },
    ],
  },
  {
    id: 'ads', name: 'Ad results', memories: 2140,
    snippets: [
      { text: '"Roof replacement, homeowners 55+" books at $48 a lead, the best in the account.', source: 'Ad results · Meta' },
      { text: 'Search ads for "roof leak repair" spike the day after rain.', source: 'Ad results · Google' },
    ],
  },
]

export const sources = ['Your CRM', 'Call recordings', 'Your sent email', 'Branch calendars', 'Invoicing', 'Meta and Google Ads']
