// Demo records for the department pages. All of it is made up.

export type Segment = { name: string; leads: number; contacted: number; replied: number; booked: number; status: 'Running' | 'Needs approval' | 'Finished' | 'Scheduled' }

export const segments: Segment[] = [
  { name: '2023 web leads, never quoted', leads: 1870, contacted: 0, replied: 0, booked: 0, status: 'Needs approval' },
  { name: 'Lost quotes, 2024', leads: 3240, contacted: 2410, replied: 388, booked: 71, status: 'Running' },
  { name: 'Hail storm, April 2025', leads: 5100, contacted: 3020, replied: 506, booked: 98, status: 'Running' },
  { name: 'Inspected, no quote sent', leads: 980, contacted: 980, replied: 214, booked: 43, status: 'Finished' },
  { name: 'Referrals never called back', leads: 410, contacted: 2, replied: 0, booked: 0, status: 'Scheduled' },
]

export type Msg = { from: 'agent' | 'lead' | 'note'; who: string; text: string; time: string }
export type Thread = { lead: string; town: string; segment: string; outcome: string; messages: Msg[] }

export const threads: Thread[] = [
  {
    lead: 'Tanya R.', town: 'Pflugerville', segment: 'Hail storm, April 2025', outcome: 'Inspection Thu 9:00 AM',
    messages: [
      { from: 'agent', who: 'Nurture', text: 'Hi Tanya, it’s Sam with Kestrel Roofing. You reached out after the April hail on Brushy Creek Ln. Did anyone ever get up on that roof?', time: 'Tue 6:12 PM' },
      { from: 'lead', who: 'Tanya', text: 'No, we kept meaning to. Insurance said we had a year. Is it too late?', time: 'Tue 7:40 PM' },
      { from: 'agent', who: 'Nurture', text: 'Not too late. You have until next April to file. A free inspection takes about 40 minutes and we can be there this week.', time: 'Tue 7:41 PM' },
      { from: 'lead', who: 'Tanya', text: 'Thursday morning works', time: 'Tue 7:58 PM' },
      { from: 'note', who: 'Booker', text: 'Booked with Austin North, Thursday 9:00 AM. Sent to Scheduler.', time: 'Tue 7:59 PM' },
    ],
  },
  {
    lead: 'Hector M.', town: 'Kyle', segment: 'Lost quotes, 2024', outcome: 'Re-quote requested',
    messages: [
      { from: 'agent', who: 'Nurture', text: 'Hi Hector, Sam from Kestrel. We quoted your roof on Caliche Way last spring. Did you end up getting it done?', time: 'Mon 5:30 PM' },
      { from: 'lead', who: 'Hector', text: 'Went with nobody. The timing was bad, kid was starting school.', time: 'Mon 8:02 PM' },
      { from: 'agent', who: 'Nurture', text: 'Makes sense. Prices moved a little since then, so I’d rather send you a fresh number than an old one. Want Priya to swing by?', time: 'Mon 8:03 PM' },
      { from: 'lead', who: 'Hector', text: 'Sure, weekends are better', time: 'Mon 8:20 PM' },
      { from: 'note', who: 'Booker', text: 'San Marcos is short on estimators. Offered Saturday with Georgetown instead.', time: 'Mon 8:21 PM' },
    ],
  },
  {
    lead: 'Keisha W.', town: 'Leander', segment: 'Inspected, no quote sent', outcome: 'Opted out',
    messages: [
      { from: 'agent', who: 'Nurture', text: 'Hi Keisha, Sam with Kestrel. We inspected your roof in June and I never sent the quote. That’s on us. Still want it?', time: 'Fri 10:15 AM' },
      { from: 'lead', who: 'Keisha', text: 'We sold the house actually. Please take me off', time: 'Fri 11:02 AM' },
      { from: 'note', who: 'CRM Watch', text: 'Marked as sold and opted out. No more messages.', time: 'Fri 11:02 AM' },
    ],
  },
]

export type AdSet = { name: string; platform: 'Meta' | 'Google'; spend: number; leads: number; booked: number; trend: number[]; status: 'Active' | 'Flagged' | 'Paused' }

export const adSets: AdSet[] = [
  { name: 'Roof replacement, homeowners 55+', platform: 'Meta', spend: 6240, leads: 130, booked: 41, trend: [54, 52, 50, 49, 48, 48, 47], status: 'Active' },
  { name: 'Storm repair, search', platform: 'Google', spend: 8810, leads: 142, booked: 38, trend: [66, 64, 63, 61, 62, 60, 62], status: 'Active' },
  { name: 'Roof leak repair, search', platform: 'Google', spend: 3920, leads: 71, booked: 19, trend: [58, 61, 55, 57, 54, 56, 55], status: 'Active' },
  { name: 'Metal roofing, interest', platform: 'Meta', spend: 2780, leads: 26, booked: 4, trend: [88, 94, 99, 104, 101, 108, 107], status: 'Flagged' },
  { name: 'Hail damage, broad', platform: 'Meta', spend: 4110, leads: 41, booked: 6, trend: [79, 85, 90, 96, 98, 101, 100], status: 'Flagged' },
  { name: 'Free inspection carousel', platform: 'Meta', spend: 3350, leads: 33, booked: 5, trend: [72, 80, 86, 93, 97, 99, 102], status: 'Flagged' },
  { name: 'Insurance claim help', platform: 'Meta', spend: 1960, leads: 19, booked: 3, trend: [84, 90, 95, 99, 103, 104, 103], status: 'Flagged' },
  { name: 'Gutters add-on, retargeting', platform: 'Meta', spend: 640, leads: 14, booked: 2, trend: [49, 47, 46, 46, 44, 45, 46], status: 'Active' },
]

export const cplWeeks = [
  { week: 'Aug 18', cpl: 82 }, { week: 'Aug 25', cpl: 79 }, { week: 'Sep 1', cpl: 84 }, { week: 'Sep 8', cpl: 77 },
  { week: 'Sep 15', cpl: 74 }, { week: 'Sep 22', cpl: 73 }, { week: 'Sep 29', cpl: 72 }, { week: 'Oct 6', cpl: 71 },
]

export type Invoice = { id: string; customer: string; address: string; branch: string; amount: number; daysOut: number; status: 'Paid' | 'Reminded' | 'Open' | 'Insurance pending' }

export const invoices: Invoice[] = [
  { id: 'INV-4411', customer: 'Glen T.', address: '310 Kestrel Run', branch: 'Austin North', amount: 2780, daysOut: 0, status: 'Paid' },
  { id: 'INV-4387', customer: 'Marisol A.', address: '88 Pecan Hollow', branch: 'San Marcos', amount: 9420, daysOut: 41, status: 'Open' },
  { id: 'INV-4362', customer: 'Brent K.', address: '17 Limestone Ct', branch: 'Round Rock', amount: 6150, daysOut: 37, status: 'Open' },
  { id: 'INV-4359', customer: 'Owen D.', address: '902 Agave Loop', branch: 'Round Rock', amount: 4880, daysOut: 34, status: 'Open' },
  { id: 'INV-4340', customer: 'Robin S.', address: '45 Live Oak Dr', branch: 'Austin North', amount: 12600, daysOut: 33, status: 'Insurance pending' },
  { id: 'INV-4338', customer: 'Mei L.', address: '1206 Cypress Mill Rd', branch: 'Georgetown', amount: 3270, daysOut: 31, status: 'Open' },
  { id: 'INV-4321', customer: 'Curtis P.', address: '5 Bluebonnet Trl', branch: 'Austin North', amount: 2100, daysOut: 22, status: 'Reminded' },
  { id: 'INV-4317', customer: 'Paige H.', address: '64 Mesquite Bend', branch: 'Georgetown', amount: 15840, daysOut: 12, status: 'Reminded' },
]

export const aging = [
  { bucket: '0–30 days', amount: 118400 },
  { bucket: '31–60 days', amount: 36320 },
  { bucket: '61–90 days', amount: 9100 },
  { bucket: '90+ days', amount: 2650 },
]

export const cashForecast = [
  { week: 'Oct 13', amount: 96000 }, { week: 'Oct 20', amount: 104000 }, { week: 'Oct 27', amount: 112000 }, { week: 'Nov 3', amount: 88000 },
  { week: 'Nov 10', amount: 94000 }, { week: 'Nov 17', amount: 101000 }, { week: 'Nov 24', amount: 71000 }, { week: 'Dec 1', amount: 83000 },
]

export type CrewJob = { crew: string; day: number; span: number; label: string; kind: 'replace' | 'repair' | 'inspect' | 'weather' }

export const crewBoard: CrewJob[] = [
  { crew: 'Crew A · Austin', day: 0, span: 2, label: '45 Live Oak Dr · tear-off', kind: 'replace' },
  { crew: 'Crew A · Austin', day: 3, span: 1, label: '5 Bluebonnet · leak', kind: 'repair' },
  { crew: 'Crew A · Austin', day: 4, span: 2, label: '210 Pecan Hollow · metal', kind: 'replace' },
  { crew: 'Crew B · Austin', day: 0, span: 1, label: 'Inspections ×4', kind: 'inspect' },
  { crew: 'Crew B · Austin', day: 1, span: 1, label: 'Rain day', kind: 'weather' },
  { crew: 'Crew B · Austin', day: 2, span: 2, label: '17 Agave Loop · replace', kind: 'replace' },
  { crew: 'Crew C · Round Rock', day: 0, span: 2, label: '902 Agave Loop · replace', kind: 'replace' },
  { crew: 'Crew C · Round Rock', day: 2, span: 1, label: 'Gutters ×2', kind: 'repair' },
  { crew: 'Crew C · Round Rock', day: 4, span: 1, label: 'Inspections ×3', kind: 'inspect' },
  { crew: 'Crew D · San Marcos', day: 1, span: 1, label: 'Rain day', kind: 'weather' },
  { crew: 'Crew D · San Marcos', day: 2, span: 3, label: '88 Pecan Hollow · metal', kind: 'replace' },
  { crew: 'Crew E · Georgetown', day: 0, span: 1, label: '1206 Cypress Mill · leak', kind: 'repair' },
  { crew: 'Crew E · Georgetown', day: 3, span: 2, label: '64 Mesquite Bend · replace', kind: 'replace' },
  { crew: 'Crew E · Georgetown', day: 5, span: 1, label: 'Saturday inspections', kind: 'inspect' },
]

export const crewNames = Array.from(new Set(crewBoard.map((j) => j.crew)))
export const weekDays = ['Mon 13', 'Tue 14', 'Wed 15', 'Thu 16', 'Fri 17', 'Sat 18']

// Median minutes from web lead to first call, by branch and hour (7 AM to 6 PM).
export const speedHours = ['7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p']
export const speedGrid: Record<string, number[]> = {
  austin: [3, 2, 2, 3, 4, 6, 5, 3, 3, 4, 6, 8],
  roundrock: [9, 6, 8, 10, 12, 18, 16, 11, 9, 12, 15, 21],
  sanmarcos: [5, 4, 5, 6, 7, 9, 8, 6, 5, 6, 7, 9],
  georgetown: [6, 5, 6, 7, 8, 10, 9, 7, 6, 7, 8, 11],
}

export const callsByHour = [12, 21, 26, 19, 17, 9, 14, 22, 18, 16, 12, 0]
