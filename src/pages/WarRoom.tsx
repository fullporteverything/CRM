import React from 'react'
import { company } from '../data/company'
import { Office } from '../components/Office'
import { money, useStore } from '../state/store'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function WarRoom({ onSelect, onBrief }: { onSelect: (id: string) => void; onBrief: () => void }) {
  const { state } = useStore()
  const open = state.approvals.filter((a) => a.status === 'open').length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div>
      <div className="war-head">
        <div>
          <div className="eyebrow">{today}</div>
          <h1>{greeting()}, {company.owner}.</h1>
          <p>
            Since midnight your agents revived <b className="num">{state.revived} leads</b>, booked <b className="num">{state.booked} inspections</b> and
            collected <b className="num">{money(state.collected)}</b>.{' '}
            {open > 0 ? <>The Chief of Staff has <b>{open} decision{open > 1 ? 's' : ''}</b> for you.</> : 'Nothing is waiting on you.'}
          </p>
          <button className="btn btn-accent" onClick={onBrief}>Brief me</button>
        </div>
        <div className="weather">
          <span aria-hidden="true">☀</span> {company.weather} · <b>{company.crewsOnRoofs} crews</b> on roofs today
        </div>
      </div>
      <Office onSelect={onSelect} />
    </div>
  )
}
