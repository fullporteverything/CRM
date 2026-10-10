import React, { useState } from 'react'
import { threads } from '../data/seed'
import { ago, useNow, useStore } from '../state/store'

const statusChip: Record<string, string> = { Running: 'ok', 'Needs approval': 'warn', Finished: '', Scheduled: 'accent' }

export function Revival() {
  const { state } = useStore()
  const now = useNow()
  const [t, setT] = useState(0)
  const segs = state.segments
  const total = segs.reduce((s, g) => s + g.leads, 0)
  const contacted = segs.reduce((s, g) => s + g.contacted, 0) + state.revived
  const replied = segs.reduce((s, g) => s + g.replied, 0) + state.revived
  const booked = segs.reduce((s, g) => s + g.booked, 0) + state.booked
  const signed = Math.round(booked * 0.29)
  const funnel = [
    { label: 'Dormant leads', value: total },
    { label: 'Contacted', value: contacted },
    { label: 'Replied', value: replied },
    { label: 'Inspections booked', value: booked },
    { label: 'Signed jobs', value: signed },
  ]
  const thread = threads[t]
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <h1>Pipeline revival</h1>
          <p>Old web leads, lost quotes and storm-season calls nobody closed. Nurture and Dialer work them back in your voice, and Booker puts the yeses on a calendar.</p>
        </div>
        <span className="chip accent">Worth about ${(signed * 14200).toLocaleString('en-US')} in signed jobs so far</span>
      </div>

      <div className="card">
        <div className="card-head"><h2>From dormant to signed</h2><span className="sub">All revival campaigns, last 90 days</span></div>
        <div className="funnel">
          {funnel.map((f) => (
            <div key={f.label} className="funnel-row">
              <span className="funnel-label">{f.label}</span>
              <div style={{ minWidth: 0 }}>
                <div className="funnel-bar" style={{ width: `${Math.max(4, (Math.sqrt(f.value) / Math.sqrt(total)) * 100)}%` }}>
                  {f.value.toLocaleString('en-US')}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Bar widths use a square-root scale so the small stages stay visible.</p>
      </div>

      <div className="card">
        <div className="card-head"><h2>Campaigns</h2><span className="sub">Each list is worked by Nurture first, then Dialer</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>List</th><th className="r">Leads</th><th className="r">Contacted</th><th className="r">Reply rate</th><th className="r">Booked</th><th>Status</th></tr>
            </thead>
            <tbody>
              {segs.map((g) => (
                <tr key={g.name}>
                  <td style={{ fontWeight: 600 }}>{g.name}</td>
                  <td className="r">{g.leads.toLocaleString('en-US')}</td>
                  <td className="r">{g.contacted.toLocaleString('en-US')}</td>
                  <td className="r">{g.contacted ? `${Math.round((g.replied / g.contacted) * 100)}%` : '–'}</td>
                  <td className="r">{g.booked}</td>
                  <td><span className={'chip ' + statusChip[g.status]}>{g.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Conversations</h2><span className="sub">Real texts would show here. These are examples.</span></div>
        <div className="threads">
          <div className="thread-list">
            {threads.map((th, i) => (
              <button key={th.lead} className="thread-btn" aria-pressed={i === t} onClick={() => setT(i)}>
                <div style={{ fontWeight: 600 }}>{th.lead} · {th.town}</div>
                <div className="muted" style={{ fontSize: 12 }}>{th.outcome}</div>
              </button>
            ))}
          </div>
          <div className="msgs" style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>{thread.segment}</div>
            {thread.messages.map((m, i) => (
              <div key={i} className={'msg ' + m.from}>
                {m.from === 'note' && <b>{m.who}: </b>}
                {m.text}
                <div className="msg-time">{m.from !== 'note' ? m.who + ' · ' : ''}{m.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Booked from revival today</h2><span className="sub">Fills in as Booker works</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Homeowner</th><th>Town</th><th>Job</th><th>Branch</th><th>When</th><th className="r">Booked</th></tr></thead>
            <tbody>
              {state.bookings.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{b.name}</td><td>{b.town}</td><td>{b.job}</td><td>{b.branch}</td><td>{b.when}</td>
                  <td className="r muted">{ago(b.at, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
