import React from 'react'
import { branches } from '../data/company'
import { speedGrid, speedHours } from '../data/seed'
import { money } from '../state/store'

// 5 minutes or less is good, 15 or more is a problem.
function heatColor(m: number) {
  if (m <= 5) return { background: 'var(--live-soft)', color: 'var(--live)' }
  if (m <= 10) return { background: 'var(--surface-2)', color: 'var(--ink-2)' }
  if (m < 15) return { background: 'var(--warn-soft)', color: 'var(--warn)' }
  return { background: 'var(--bad-soft)', color: 'var(--bad)' }
}

export function Branches() {
  const total = branches.reduce((s, b) => s + b.revenueMonth, 0)
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <h1>Branches</h1>
          <p>How each location is doing this month. SLA Monitor times every lead, and Nudger follows up with the manager when a branch slips.</p>
        </div>
        <span className="chip">{money(total)} across {branches.length} branches this month</span>
      </div>

      <div className="grid cols-2">
        {branches.map((b) => (
          <div key={b.id} className="card">
            <div className="card-head">
              <div>
                <h2>{b.name}</h2>
                <div className="sub">{b.manager} · {b.crews} crews</div>
              </div>
              {b.note ? <span className="chip warn">{b.note}</span> : <span className="chip ok">On track</span>}
            </div>
            <div className="stats">
              <div><div className="k muted" style={{ fontSize: 12 }}>Leads</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{b.leadsMonth}</div></div>
              <div><div className="k muted" style={{ fontSize: 12 }}>Booked</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{b.booked}</div></div>
              <div><div className="k muted" style={{ fontSize: 12 }}>Close rate</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{b.closeRate}%</div></div>
              <div>
                <div className="k muted" style={{ fontSize: 12 }}>Speed to lead</div>
                <div className={'num ' + (b.speedToLead > 10 ? 'down' : '')} style={{ fontWeight: 700, fontSize: 18 }}>{b.speedToLead} min</div>
              </div>
              <div><div className="k muted" style={{ fontSize: 12 }}>Revenue</div><div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{money(b.revenueMonth)}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h2>Speed to lead by hour</h2><span className="sub">Median minutes from a web lead to the first call, last 30 days</span></div>
        <div className="table-wrap">
          <div className="heat" style={{ gridTemplateColumns: `110px repeat(${speedHours.length}, minmax(34px, 1fr))`, minWidth: 560 }}>
            <span />
            {speedHours.map((h) => <span key={h} className="muted" style={{ textAlign: 'center' }}>{h}</span>)}
            {branches.map((b) => (
              <React.Fragment key={b.id}>
                <span style={{ fontWeight: 600, alignSelf: 'center' }}>{b.name}</span>
                {speedGrid[b.id].map((m, i) => (
                  <span key={i} className="heat-cell" style={heatColor(m)} title={`${b.name}, ${speedHours[i]}: ${m} min`}>{m}</span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Green is 5 minutes or less. Red is 15 or more. Round Rock slows down at lunch and after 5 PM.</p>
      </div>
    </div>
  )
}
