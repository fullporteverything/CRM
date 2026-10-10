import React, { useEffect } from 'react'
import type { ReactNode } from 'react'
import { agentById, departments, shelves } from '../data/agents'
import { branches, company } from '../data/company'
import { ago, money, useNow, useStore } from '../state/store'
import { Avatar } from './Rail'

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button className="btn btn-ghost close" onClick={onClose} aria-label="Close">
      Close
    </button>
  )
}

export function formatMetric(value: number, unit?: string) {
  if (unit === '$') return money(value)
  if (unit) return `${value} ${unit}`
  return value.toLocaleString('en-US')
}

export function AgentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const now = useNow(15_000)
  useEscape(onClose)
  const a = agentById[id]
  if (!a) return null
  const paused = state.paused.includes(id)
  const mine = state.feed.filter((f) => f.agent === id || f.to === id).slice(0, 8)
  const status = state.status[id]?.text ?? a.idle[0]
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={a.name}>
        <CloseButton onClose={onClose} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar id={id} size={44} />
          <div>
            <div className="eyebrow">{departments[a.dept].name}</div>
            <h2>{a.name}</h2>
          </div>
        </div>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>{a.role}</p>
        <div className="stats">
          <div className="stat">
            <div className="v">{formatMetric(a.metric.value, a.metric.unit)}</div>
            <div className="k">{a.metric.label}</div>
          </div>
          <div className="stat">
            <div className="v" style={{ fontSize: 15, paddingTop: 4 }}>
              {paused ? <span className="chip">Paused</span> : <span className="chip ok"><span className="pulse" />Working</span>}
            </div>
            <div className="k" style={{ marginTop: 6 }}>{paused ? 'Not taking new work' : status.charAt(0).toUpperCase() + status.slice(1)}</div>
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Reads from the Brain</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {a.reads.map((r) => (
              <span key={r} className="chip">{shelves.find((s) => s.id === r)?.name}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Recent work</div>
          {mine.length === 0 && <p className="muted">Nothing yet this session. It will show up here as it happens.</p>}
          <div className="feed">
            {mine.map((f) => (
              <div key={f.id} className="feed-item">
                <Avatar id={f.agent} size={22} />
                <div>
                  <div>{f.text}</div>
                  <div className="feed-meta">{ago(f.at, now)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button className={paused ? 'btn btn-accent' : 'btn'} onClick={() => dispatch({ type: 'togglePause', agent: id })}>
            {paused ? `Resume ${a.name}` : `Pause ${a.name}`}
          </button>
        </div>
      </div>
    </>
  )
}

export function BriefModal({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  useEscape(onClose)
  const open = state.approvals.filter((a) => a.status === 'open')
  const slowest = [...branches].sort((a, b) => b.speedToLead - a.speedToLead)[0]
  const pastDue = state.invoices.filter((i) => i.daysOut > 30 && i.status !== 'Paid')
  const parts: ReactNode[] = [
    <p key="1">
      Since midnight the team revived <b>{state.revived} old leads</b> and booked <b>{state.booked} inspections</b>. {money(state.collected)} came in, mostly
      final payments on replacements in Austin North.
    </p>,
    <p key="2">
      {slowest.name} is the soft spot. Median speed to lead there is {slowest.speedToLead} minutes, against 4 in Austin North, and {slowest.note?.toLowerCase()}.
      Nudger has a note ready for {slowest.manager}.
    </p>,
    <p key="3">
      Marketing is spending on four ad sets that cost over $95 a lead. The 55+ replacement audience is still the best at $48. Blended cost per lead is
      ${state.cpl} right now.
    </p>,
    <p key="4">
      {pastDue.length} invoices are past 30 days. {pastDue.filter((i) => i.status === 'Reminded').length > 0 ? 'Reminders have gone out.' : 'Invoice Chaser is waiting on your go-ahead to send reminders.'}
    </p>,
    <p key="5">
      {open.length === 0 ? 'You’re clear. Nothing is waiting on you.' : `${open.length} decision${open.length > 1 ? 's are' : ' is'} waiting on you in the rail on the right.`}
    </p>,
  ]
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Morning brief">
        <CloseButton onClose={onClose} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <Avatar id="chief" size={36} />
          <div>
            <div className="eyebrow">Chief of Staff</div>
            <h2 style={{ fontSize: 19 }}>Your brief, {company.owner}</h2>
          </div>
        </div>
        <div className="brief">{parts}</div>
      </div>
    </>
  )
}
