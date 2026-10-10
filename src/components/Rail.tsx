import React, { useState } from 'react'
import { agentById, departments } from '../data/agents'
import { ago, useNow, useStore } from '../state/store'

export function Avatar({ id, size = 26 }: { id: string; size?: number }) {
  const a = agentById[id]
  if (!a) return null
  const initials = a.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return (
    <span className="avatar" style={{ background: departments[a.dept].color, width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  )
}

export function Rail({ onSelect }: { onSelect: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const now = useNow(15_000)
  const open = state.approvals.filter((a) => a.status === 'open')
  const held = state.approvals.filter((a) => a.status === 'held')
  const [expanded, setExpanded] = useState<string | null>(open[1]?.id ?? null)

  return (
    <aside className="rail" aria-label="Decisions and live activity">
      <section>
        <div className="rail-head">
          <div>
            <h3>Chief of Staff asks</h3>
            <div className="rail-sub">
              {open.length === 0 ? 'Nothing waiting on you' : `${open.length} decision${open.length > 1 ? 's' : ''} waiting on you`}
            </div>
          </div>
          {open.length > 1 && (
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'approveAll' })}>
              Approve all {open.length}
            </button>
          )}
        </div>
        <div className="asks">
          {open.map((a) => {
            const isOpen = expanded === a.id
            const agent = agentById[a.agent]
            return (
              <div key={a.id} className={'ask' + (isOpen ? ' open-detail' : '')}>
                <div className="ask-row">
                  <Avatar id={a.agent} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ask-from">{agent.name} · {departments[agent.dept].name}</div>
                    <button className="ask-title" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : a.id)}>
                      {a.title}
                    </button>
                  </div>
                  {!isOpen && (
                    <button className="btn" onClick={() => dispatch({ type: 'approve', id: a.id })}>Approve</button>
                  )}
                </div>
                {isOpen && (
                  <>
                    <p className="ask-detail">{a.detail}</p>
                    <div className="ask-impact">{a.impact}</div>
                    <div className="ask-actions">
                      <button className="btn btn-accent" onClick={() => dispatch({ type: 'approve', id: a.id })}>Approve</button>
                      <button className="btn" onClick={() => dispatch({ type: 'hold', id: a.id })}>Hold</button>
                      <button className="btn btn-ghost" onClick={() => onSelect(a.agent)}>Ask {agent.name}</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {held.map((a) => (
            <div key={a.id} className="held">
              <span>On hold: {a.title}</span>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'reopen', id: a.id })}>Undo</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="rail-head">
          <h3>What your agents just did</h3>
          <span className="pill"><span className="pulse" />Live</span>
        </div>
        <div className="feed" aria-live="polite">
          {state.feed.slice(0, 14).map((f) => (
            <div key={f.id} className="feed-item">
              <Avatar id={f.agent} size={22} />
              <div style={{ minWidth: 0 }}>
                <div>{f.text}</div>
                <div className="feed-meta">{agentById[f.agent]?.name} · {ago(f.at, now)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}
