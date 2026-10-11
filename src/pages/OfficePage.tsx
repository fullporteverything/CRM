import React, { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../state/app'
import { useStore } from '../state/store'
import { Office } from '../components/Office'
import { Avatar, Icon, Modal, Stars } from '../components/ui'
import { company } from '../data/company'
import { ago, greeting, longDate, money, plural } from '../lib/format'
import type { Agent } from '../biz/types'

// The war room: what every agent is doing, what the Chief of Staff needs from
// you, and a live feed. The sample business runs the original simulation;
// a live business (Shoebox) fills the same layout from its real data.

type Ask = {
  id: string
  agent: string
  title: string
  detail?: ReactNode
  impact?: string
  approve: { label: string; run: () => void }
  extra?: { label: string; run: () => void; danger?: boolean }
  hold: () => void
}
type Model = {
  summary: ReactNode
  pill: ReactNode
  agents: Agent[]
  asks: Ask[]
  held: { id: string; title: string; undo: () => void }[]
  approveAll?: { label: string; run: () => void }
  feed: { id: string | number; agent: string; text: string; at: number; contactId?: string | null }[]
  board: { title: string; stats: [string, string][] }
  live?: { talking: string[]; handoffs: { id: number; from: string; to: string }[]; done: (id: number) => void }
}

function useDemoModel(): Model | null {
  const { data } = useApp()
  const { state, dispatch } = useStore()
  if (!data) return null
  const now = Date.now()
  const open = state.approvals.filter((a) => a.status === 'open')
  const statusOf = (id: string) => state.status[id]?.text
  const agents = data.office.agents.map((a) => ({ ...a, status: statusOf(a.id) ? statusOf(a.id)!.charAt(0).toUpperCase() + statusOf(a.id)!.slice(1) : a.status, needsYou: a.id === 'chief' ? open.length : 0 }))
  return {
    summary: <>Since midnight your agents revived <b className="num">{state.revived} leads</b>, booked <b className="num">{state.booked} inspections</b> and collected <b className="num">{money(state.collected, { short: false })}</b>. {open.length > 0 ? <>The Chief of Staff has <b>{open.length} decision{open.length > 1 ? 's' : ''}</b> for you.</> : 'Nothing is waiting on you.'}</>,
    pill: <><span aria-hidden="true">☀</span> {company.weather} · <b>{company.crewsOnRoofs} crews</b> on roofs today</>,
    agents,
    asks: open.map((a) => ({
      id: a.id, agent: a.agent, title: a.title, detail: a.detail, impact: a.impact,
      approve: { label: 'Approve', run: () => dispatch({ type: 'approve', id: a.id }) },
      hold: () => dispatch({ type: 'hold', id: a.id }),
    })),
    held: state.approvals.filter((a) => a.status === 'held').map((a) => ({ id: a.id, title: a.title, undo: () => dispatch({ type: 'reopen', id: a.id }) })),
    approveAll: open.length > 1 ? { label: `Approve all ${open.length}`, run: () => dispatch({ type: 'approveAll' }) } : undefined,
    feed: state.feed.map((f) => ({ id: f.id, agent: f.agent, text: f.text, at: f.at })),
    board: { title: `Today at ${company.name}`, stats: [['Leads revived', String(state.revived)], ['Booked', String(state.booked)], ['Collected', money(state.collected)]] },
    live: { talking: state.feed.filter((f) => now - f.at < 8000).slice(0, 2).map((f) => f.agent), handoffs: state.handoffs, done: (id) => dispatch({ type: 'clearHandoff', id }) },
  }
}

function useLiveModel(hidden: Set<string>, hide: (id: string, on: boolean) => void, confirmAll: () => void): Model | null {
  const { data, act, openContact } = useApp()
  if (!data) return null
  const items = data.assist.items
  const reviewOf = new Map(data.reviews.map((r) => [r.contactId, r]))
  const asks: Ask[] = items.filter((x) => !hidden.has(x.id)).map((x) => {
    const review = x.id.startsWith('rv:') && x.contactId ? reviewOf.get(x.contactId) : undefined
    if (review) {
      return {
        id: x.id, agent: 'reviews', title: x.title,
        detail: <><Stars n={review.rating} /> “{review.body}”</>,
        impact: 'Shows on the Shoebox homepage once approved. Judge the content, not the stars.',
        approve: { label: 'Approve', run: () => void act('setReview', review.contactId, 'approved') },
        extra: { label: 'Reject', danger: true, run: () => void act('setReview', review.contactId, 'rejected') },
        hold: () => hide(x.id, true),
      }
    }
    const agent = x.id.startsWith('cf:') || x.id.startsWith('lk:') ? 'security' : x.id.startsWith('sh:') ? 'recovery' : x.id.startsWith('ar:') ? 'retention' : 'chief'
    return {
      id: x.id, agent, title: x.title, detail: x.sub,
      impact: agent === 'retention' ? 'A short personal note often brings people back before filing season.' : agent === 'security' ? 'Worth checking the person is who they say before helping.' : undefined,
      approve: { label: 'Open account', run: () => x.contactId && openContact(x.contactId) },
      hold: () => hide(x.id, true),
    }
  })
  const pending = data.reviews.filter((r) => r.status === 'pending' && !hidden.has('rv:' + r.contactId))
  const online = data.live.online
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const joined = data.signups.filter((t) => t >= today.getTime()).length
  const sold = data.revenue.filter((r) => r.at >= today.getTime()).length
  return {
    summary: <>Since midnight <b className="num">{joined} {joined === 1 ? 'person' : 'people'}</b> signed up and <b className="num">{sold} {sold === 1 ? 'pass' : 'passes'}</b> sold. <b className="num">{online}</b> {online === 1 ? 'person is' : 'people are'} in Shoebox right now. {asks.length > 0 ? <>The Chief of Staff has <b>{asks.length} thing{asks.length > 1 ? 's' : ''}</b> for you.</> : 'Nothing is waiting on you.'}</>,
    pill: <><span className="dot" style={{ background: online ? 'var(--good)' : 'var(--ink-3)' }} /> {plural(joined, 'sign-up')} today · {online} online · {plural(data.revenue.length, 'pass', 'passes')} sold</>,
    agents: data.office.agents,
    asks,
    held: items.filter((x) => hidden.has(x.id)).map((x) => ({ id: x.id, title: x.title, undo: () => hide(x.id, false) })),
    approveAll: pending.length > 1 ? { label: `Approve all ${pending.length}`, run: confirmAll } : undefined,
    feed: data.office.feed,
    board: data.office.board,
  }
}

export function OfficePage() {
  const { data, business, openContact, act } = useApp()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [brief, setBrief] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [confirmAll, setConfirmAll] = useState(false)
  const hide = (id: string, on: boolean) => setHidden((h) => { const n = new Set(h); if (on) n.add(id); else n.delete(id); return n })
  const demo = useDemoModel()
  const live = useLiveModel(hidden, hide, () => setConfirmAll(true))
  const m = business.connector === 'demo' ? demo : live
  const names = useMemo(() => new Map(data?.office.agents.map((a) => [a.id, a.name])), [data])
  if (!data || !m) return null
  const { office } = data
  const agent = m.agents.find((a) => a.id === agentId)
  const first = expanded ?? m.asks[Math.min(1, m.asks.length - 1)]?.id ?? null
  const deptOf = (id: string) => office.depts[m.agents.find((a) => a.id === id)?.dept ?? 'exec']
  const pending = data.reviews.filter((r) => r.status === 'pending' && !hidden.has('rv:' + r.contactId))

  return (
    <>
      <div className="war-head">
        <div>
          <div className="eyebrow">{longDate(Date.now())}</div>
          <h1>{greeting()}, {data.owner.name}.</h1>
          <p>{m.summary}</p>
          <button className="btn btn-primary" onClick={() => setBrief(true)}><Icon name="sparkle" /> Brief me</button>
        </div>
        <div className="weather">{m.pill}</div>
      </div>

      <div className="war">
        <section className="card office-card">
          <Office agents={m.agents} depts={office.depts} board={m.board} onSelect={setAgentId} live={m.live} />
        </section>
        <aside className="rail" aria-label="Decisions and live activity">
          <section>
            <div className="rail-head">
              <div>
                <h3>Chief of Staff asks</h3>
                <div className="rail-sub">{m.asks.length === 0 ? 'Nothing waiting on you' : `${m.asks.length} decision${m.asks.length > 1 ? 's' : ''} waiting on you`}</div>
              </div>
              {m.approveAll && <button className="btn btn-sm" onClick={m.approveAll.run}>{m.approveAll.label}</button>}
            </div>
            <div className="asks">
              {m.asks.map((a) => {
                const isOpen = first === a.id
                return (
                  <div key={a.id} className={'ask' + (isOpen ? ' open-detail' : '')}>
                    <div className="ask-row">
                      <Avatar name={names.get(a.agent) ?? a.agent} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ask-from">{names.get(a.agent) ?? 'Agent'} · {deptOf(a.agent)}</div>
                        <button className="ask-title" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? '' : a.id)}>{a.title}</button>
                      </div>
                      {!isOpen && <button className="btn btn-sm" onClick={a.approve.run}>{a.approve.label}</button>}
                    </div>
                    {isOpen && (
                      <>
                        {a.detail && <div className="ask-detail">{a.detail}</div>}
                        {a.impact && <div className="ask-impact">{a.impact}</div>}
                        <div className="ask-actions">
                          <button className="btn btn-sm btn-primary" onClick={a.approve.run}>{a.approve.label}</button>
                          {a.extra && <button className={'btn btn-sm' + (a.extra.danger ? ' btn-danger' : '')} onClick={a.extra.run}>{a.extra.label}</button>}
                          <button className="btn btn-sm" onClick={a.hold}>Hold</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setAgentId(a.agent)}>Ask {names.get(a.agent) ?? 'agent'}</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {m.held.map((h) => (
                <div key={h.id} className="held"><span>On hold: {h.title}</span><button className="btn btn-sm btn-ghost" onClick={h.undo}>Undo</button></div>
              ))}
            </div>
          </section>
          <section>
            <div className="rail-head">
              <h3>What your agents just did</h3>
              <span className="tag good"><span className="dot pulse" style={{ background: 'var(--good)' }} /> Live</span>
            </div>
            <div className="feed" aria-live="polite">
              {m.feed.length === 0 && <div className="faint" style={{ fontSize: 13, padding: '8px 0' }}>Nothing yet.</div>}
              {m.feed.slice(0, 14).map((f) => (
                <button key={f.id} className="feed-row" onClick={() => f.contactId && openContact(f.contactId)} disabled={!f.contactId}>
                  <Avatar name={names.get(f.agent) ?? f.agent} size="sm" />
                  <span style={{ minWidth: 0 }}><span>{f.text}</span><span className="feed-meta">{names.get(f.agent) ?? 'Agent'} · {ago(f.at)}</span></span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="agent-grid">
        {m.agents.map((a) => (
          <button key={a.id} className="card agent-card" onClick={() => setAgentId(a.id)}>
            <span className="n"><span className="dot" style={{ background: `var(--dept-${a.dept})` }} />{a.name}</span>
            <span className="v">{a.metric.value}</span>
            <span className="faint" style={{ fontSize: 11.5, marginTop: -6 }}>{a.metric.label}</span>
            <span className="st">{a.status}</span>
          </button>
        ))}
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 14 }}>{office.note}</p>

      {agent && (
        <Modal onClose={() => setAgentId(null)} label={agent.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Avatar name={agent.name} size="lg" />
            <div><h2>{agent.name}</h2><div className="faint" style={{ fontSize: 12.5 }}>{office.depts[agent.dept]} · {business.name}</div></div>
          </div>
          <p style={{ margin: '0 0 12px', color: 'var(--ink-2)' }}>{agent.role}</p>
          <div className="facts" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="fact"><div className="k">Right now</div><div className="v" style={{ fontSize: 14 }}>{agent.status}</div></div>
            <div className="fact"><div className="k">{agent.metric.label}</div><div className="v">{agent.metric.value}</div></div>
          </div>
          {agent.watches.length > 0 && <p className="faint" style={{ fontSize: 12.5, margin: '12px 0 0' }}>Reads: {agent.watches.join(', ')}</p>}
          <h3 style={{ margin: '16px 0 8px', fontSize: 14 }}>Recent</h3>
          {m.feed.filter((f) => f.agent === agent.id).slice(0, 6).map((f) => (
            <div key={f.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>{f.text}<div className="feed-meta">{ago(f.at)}</div></div>
          ))}
          {m.feed.every((f) => f.agent !== agent.id) && <div className="faint" style={{ fontSize: 13 }}>Nothing recent.</div>}
          <div className="modal-actions"><button className="btn btn-primary" onClick={() => setAgentId(null)}>Close</button></div>
        </Modal>
      )}

      {brief && (
        <Modal onClose={() => setBrief(false)} label="Your brief" wide>
          <div className="eyebrow">Brief from the Chief of Staff</div>
          <h2 style={{ marginTop: 6 }}>{greeting()}, {data.owner.name}.</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.55 }}>{m.summary}</p>
          <div className="facts" style={{ margin: '14px 0' }}>
            {m.board.stats.map(([k, v]) => <div key={k} className="fact"><div className="k">{k}</div><div className="v">{v}</div></div>)}
          </div>
          {m.asks.length > 0 && <>
            <h3 style={{ margin: '14px 0 6px', fontSize: 14 }}>Needs you</h3>
            {m.asks.map((a) => <div key={a.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}><b>{a.title}</b>{a.impact && <div className="ask-impact" style={{ marginTop: 3 }}>{a.impact}</div>}</div>)}
          </>}
          <h3 style={{ margin: '14px 0 6px', fontSize: 14 }}>Latest</h3>
          {m.feed.slice(0, 5).map((f) => <div key={f.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>{f.text}<div className="feed-meta">{names.get(f.agent)} · {ago(f.at)}</div></div>)}
          <div className="modal-actions"><button className="btn btn-primary" onClick={() => setBrief(false)}>Got it</button></div>
        </Modal>
      )}

      {confirmAll && (
        <Modal onClose={() => setConfirmAll(false)} label="Approve reviews" wide>
          <h2>Approve {pending.length} reviews?</h2>
          <p>Read each one first. Approve or reject on content (spam, abuse, private details), never on the rating.</p>
          {pending.map((r) => (
            <div key={r.contactId} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
              <Stars n={r.rating} /> <b style={{ marginLeft: 6 }}>{r.name}</b>
              <div style={{ color: 'var(--ink-2)', marginTop: 4 }}>“{r.body}”</div>
            </div>
          ))}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmAll(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={async () => { for (const r of pending) await act('setReview', r.contactId, 'approved'); setConfirmAll(false) }}><Icon name="check" /> Approve all {pending.length}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
