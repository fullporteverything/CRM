// Everything specific to the business lives here. Swap these values to re-skin
// the demo for a different company or trade.

export const company = {
  product: 'Foreman',
  name: 'Kestrel Roofing',
  since: 'Central Texas since 2011',
  owner: 'Sam',
  weather: 'Austin, 81° and clear',
  crewsOnRoofs: 14,
}

export type Branch = {
  id: string
  name: string
  manager: string
  crews: number
  leadsMonth: number
  booked: number
  closeRate: number // percent
  speedToLead: number // median minutes
  revenueMonth: number
  note?: string
}

export const branches: Branch[] = [
  { id: 'austin', name: 'Austin North', manager: 'Dana Ortiz', crews: 5, leadsMonth: 412, booked: 138, closeRate: 34, speedToLead: 4, revenueMonth: 486200 },
  { id: 'roundrock', name: 'Round Rock', manager: 'Marcus Webb', crews: 4, leadsMonth: 356, booked: 97, closeRate: 27, speedToLead: 11, revenueMonth: 341900, note: '11 estimates gone cold this week' },
  { id: 'sanmarcos', name: 'San Marcos', manager: 'Priya Shah', crews: 3, leadsMonth: 231, booked: 84, closeRate: 36, speedToLead: 6, revenueMonth: 262400, note: 'Two estimators out until Oct 20' },
  { id: 'georgetown', name: 'Georgetown', manager: 'Luis Carrillo', crews: 2, leadsMonth: 148, booked: 52, closeRate: 31, speedToLead: 7, revenueMonth: 174800 },
]

export const towns = ['Pflugerville', 'Cedar Park', 'Hutto', 'Kyle', 'Leander', 'Buda', 'Taylor', 'Wimberley', 'Liberty Hill', 'Manor']
export const streets = ['Mesquite Bend', 'Kestrel Run', 'Pecan Hollow', 'Limestone Ct', 'Bluebonnet Trl', 'Cypress Mill Rd', 'Caliche Way', 'Live Oak Dr', 'Brushy Creek Ln', 'Agave Loop']
export const firstNames = ['Tanya', 'Derek', 'Latoya', 'Glen', 'Marisol', 'Brent', 'Keisha', 'Hector', 'Robin', 'Owen', 'Yesenia', 'Curtis', 'Mei', 'Darnell', 'Paige', 'Ruben']
export const lastInitials = ['R.', 'M.', 'J.', 'T.', 'A.', 'K.', 'W.', 'S.', 'P.', 'D.', 'L.', 'H.']
export const jobTypes = ['roof inspection', 'hail damage claim', 'full replacement quote', 'leak repair', 'metal roof quote', 'gutter + fascia repair']
