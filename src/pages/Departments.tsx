import React from 'react'
import { agents } from '../data/agents'
import type { DeptId } from '../data/agents'
import { aging, callsByHour, cashForecast, cplWeeks, crewBoard, crewNames, weekDays } from '../data/seed'
import { ColumnChart, HBars, LineChart, Sparkline } from '../components/Charts'
import { formatMetric } from '../components/Overlays'
import { Avatar } from '../components/Rail'
import { money, useStore } from '../state/store'

function AgentCards({ dept, onSelect }: { dept: DeptId; onSelect: (id: string) => void }) {
  const { state } = useStore()
  return (
    <div className="agent-cards">
      {agents.filter((a) => a.dept === dept).map((a) => {
        const paused = state.paused.includes(a.id)
        const st = state.status[a.id]?.text ?? a.idle[0]
        return (
          <button key={a.id} className="card agent-card" onClick={() => onSelect(a.id)}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><Avatar id={a.id} size={22} />{a.name}</span>
              {paused ? <span className="chip">Paused</span> : <span className="chip ok">Working</span>}
            </div>
            <div className="v">{formatMetric(a.metric.value, a.metric.unit)}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: -6 }}>{a.metric.label}</div>
            <div className="status">{st.charAt(0).toUpperCase() + st.slice(1)}</div>
          </button>
        )
      })}
    </div>
  )
}

function Head({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  )
}

export function Sales({ onSelect }: { onSelect: (id: string) => void }) {
  const { state } = useStore()
  const hours = ['7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p']
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Head title="Sales" text="Every lead gets a call inside two minutes, every reply gets an answer, and every yes lands on a branch calendar." />
      <AgentCards dept="sales" onSelect={onSelect} />
      <div className="stats">
        <div className="stat"><div className="v">{state.revived}</div><div className="k">Leads revived today</div></div>
        <div className="stat"><div className="v">{state.booked}</div><div className="k">Inspections booked today</div></div>
        <div className="stat"><div className="v">2 min</div><div className="k">Median time to first call</div></div>
        <div className="stat"><div className="v">31%</div><div className="k">Inspection to signed, 30 days</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Calls by hour</h2><span className="sub">Dialer, today</span></div>
        <ColumnChart data={callsByHour.map((v, i) => ({ label: hours[i], value: v }))} format={(n) => String(Math.round(n))} color="var(--dept-sales)" />
      </div>
    </div>
  )
}

export function Operations({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Head title="Branch ops" text="Scheduler keeps crews busy and off wet roofs. SLA Monitor and Nudger make sure no lead or estimate sits." />
      <AgentCards dept="ops" onSelect={onSelect} />
      <div className="card">
        <div className="card-head">
          <h2>Crew board, next week</h2>
          <span className="sub">Rain forecast Tuesday. Two tear-offs already moved.</span>
        </div>
        <div className="table-wrap">
          <div className="board" style={{ gridTemplateColumns: `150px repeat(${weekDays.length}, minmax(0, 1fr))` }}>
            <span />
            {weekDays.map((d) => <span key={d} className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{d}</span>)}
            {crewNames.map((crew, r) => (
              <React.Fragment key={crew}>
                <span className="board-crew" style={{ gridRow: r + 2, gridColumn: 1 }}>{crew}</span>
                {crewBoard.filter((j) => j.crew === crew).map((j) => (
                  <span key={j.label + j.day} className={'board-job ' + j.kind} style={{ gridRow: r + 2, gridColumn: `${j.day + 2} / span ${j.span}` }} title={j.label}>
                    {j.label}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--accent)' }} />Replacement</span>
          <span><i style={{ background: 'var(--warn)' }} />Repair</span>
          <span><i style={{ background: 'var(--live)' }} />Inspections</span>
          <span><i style={{ background: 'var(--ink-3)' }} />Weather hold</span>
        </div>
      </div>
    </div>
  )
}

export function Marketing({ onSelect }: { onSelect: (id: string) => void }) {
  const { state } = useStore()
  const live = state.adSets.filter((a) => a.status !== 'Paused')
  const spend = state.adSets.reduce((s, a) => s + a.spend, 0)
  const leads = state.adSets.reduce((s, a) => s + a.leads, 0)
  const booked = state.adSets.reduce((s, a) => s + a.booked, 0)
  const weeks = cplWeeks.map((w) => ({ label: w.week, value: w.cpl }))
  if (state.cpl !== weeks[weeks.length - 1].value) weeks.push({ label: 'Projected', value: state.cpl })
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Head title="Marketing" text="Ad Optimizer judges ads by booked inspections, not clicks. Creative Scout writes new angles from what homeowners actually say on calls." />
      <AgentCards dept="marketing" onSelect={onSelect} />
      <div className="stats">
        <div className="stat"><div className="v">{money(spend)}</div><div className="k">Ad spend, month to date</div></div>
        <div className="stat"><div className="v">{leads}</div><div className="k">Leads from ads</div></div>
        <div className="stat"><div className="v">${state.cpl}</div><div className="k">Blended cost per lead</div><div className="d up">Down from $82 in August</div></div>
        <div className="stat"><div className="v">{money(spend / booked)}</div><div className="k">Cost per booked inspection</div></div>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h2>Cost per lead by week</h2><span className="sub">Meta and Google combined</span></div>
          <LineChart data={weeks} format={(n) => `$${Math.round(n)}`} target={{ value: 60, label: 'Target' }} />
        </div>
        <div className="card">
          <div className="card-head"><h2>Where the money goes</h2><span className="sub">{live.length} of {state.adSets.length} ad sets running</span></div>
          <HBars
            rows={[...state.adSets].sort((a, b) => b.spend - a.spend).slice(0, 6).map((a) => ({ label: a.name.split(',')[0], value: a.spend }))}
            format={money}
            color={() => 'var(--dept-marketing)'}
          />
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Ad sets</h2><span className="sub">Flagged means over $95 a lead for 5+ days</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ad set</th><th>Platform</th><th className="r">Spend</th><th className="r">Leads</th><th className="r">Cost per lead</th><th>7 days</th><th className="r">Booked</th><th>Status</th></tr></thead>
            <tbody>
              {state.adSets.map((a) => {
                const cpl = a.spend / a.leads
                return (
                  <tr key={a.name} style={{ opacity: a.status === 'Paused' ? 0.55 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{a.platform}</td>
                    <td className="r">{money(a.spend)}</td>
                    <td className="r">{a.leads}</td>
                    <td className={'r ' + (cpl > 95 ? 'down' : '')}>{money(cpl)}</td>
                    <td><Sparkline values={a.trend} bad={a.trend[a.trend.length - 1] > a.trend[0]} /></td>
                    <td className="r">{a.booked}</td>
                    <td><span className={'chip ' + (a.status === 'Active' ? 'ok' : a.status === 'Flagged' ? 'bad' : '')}>{a.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function Finance({ onSelect }: { onSelect: (id: string) => void }) {
  const { state } = useStore()
  const open = state.invoices.filter((i) => i.status !== 'Paid')
  const openTotal = aging.reduce((s, a) => s + a.amount, 0)
  const late = aging.slice(1).reduce((s, a) => s + a.amount, 0)
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Head title="Finance" text="Invoice Chaser follows up on every open balance in your voice. Forecaster tells you what cash is coming and when." />
      <AgentCards dept="finance" onSelect={onSelect} />
      <div className="stats">
        <div className="stat"><div className="v">{money(state.collected)}</div><div className="k">Collected today</div></div>
        <div className="stat"><div className="v">{money(openTotal)}</div><div className="k">Open receivables</div></div>
        <div className="stat"><div className="v">{money(late)}</div><div className="k">Past 30 days</div></div>
        <div className="stat"><div className="v">$412,000</div><div className="k">Cash expected, next 30 days</div></div>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h2>Receivables by age</h2></div>
          <HBars rows={aging.map((a) => ({ label: a.bucket, value: a.amount }))} format={money}
            color={(i) => ['var(--live)', 'var(--warn)', 'var(--bad)', 'var(--bad)'][i]} />
        </div>
        <div className="card">
          <div className="card-head"><h2>Cash forecast</h2><span className="sub">By week, from the schedule and open invoices</span></div>
          <ColumnChart data={cashForecast.map((c) => ({ label: c.week, value: c.amount }))} format={(n) => `$${Math.round(n / 1000)}k`} color="var(--dept-finance)" height={170} />
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Invoices to watch</h2><span className="sub">{open.length} open</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Address</th><th>Branch</th><th className="r">Amount</th><th className="r">Days out</th><th>Status</th></tr></thead>
            <tbody>
              {state.invoices.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.id}</td><td style={{ fontWeight: 600 }}>{i.customer}</td><td>{i.address}</td><td>{i.branch}</td>
                  <td className="r">{money(i.amount)}</td><td className={'r ' + (i.daysOut > 30 ? 'down' : '')}>{i.daysOut}</td>
                  <td><span className={'chip ' + ({ Paid: 'ok', Reminded: 'accent', Open: 'warn', 'Insurance pending': '' } as Record<string, string>)[i.status]}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
