import React, { useEffect, useState } from 'react'
import { useApp } from '../state/app'
import { Avatar, Icon, Seg, Stars, StatusTag } from './ui'
import type { ActivityKind } from '../biz/types'
import { ago, fullMoney, shortDate } from '../lib/format'
import { stageOf } from '../biz/derive'

const kinds: { value: ActivityKind; label: string }[] = [
  { value: 'note', label: 'Note' }, { value: 'call', label: 'Call' }, { value: 'email', label: 'Email' }, { value: 'task', label: 'Task' },
]

export function ContactDrawer({ id }: { id: string }) {
  const { data, openContact, act, business } = useApp()
  const [text, setText] = useState('')
  const [kind, setKind] = useState<ActivityKind>('note')
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)
  const [allDevices, setAllDevices] = useState(false)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && openContact(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [openContact])
  if (!data) return null
  const c = data.contacts.find((x) => x.id === id)
  if (!c) return null
  const deals = data.deals.filter((d) => d.contactId === id)
  const review = data.reviews.find((r) => r.contactId === id)
  const timeline = data.activities.filter((a) => a.contactId === id)
  const shoebox = business.connector === 'shoebox'

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const ok = await act('addNote', id, kind, text.trim(), kind === 'task' && due ? new Date(due + 'T09:00').getTime() : null)
    setBusy(false)
    if (ok) {
      setText('')
      setDue('')
    }
  }

  return (
    <>
      <div className="overlay" onClick={() => openContact(null)} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={c.name}>
        <div className="drawer-head">
          <Avatar name={c.name} size="lg" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2>{c.name}</h2>
            <p>{c.email}{c.company ? ` · ${c.company}` : ''}</p>
          </div>
          <StatusTag status={c.status} closedLabel={shoebox ? 'Shredded' : undefined} />
          <button className="icon-btn" onClick={() => openContact(null)} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          <div className="facts">
            <div className="fact"><div className="k">Lifetime value</div><div className="v">{fullMoney(c.value)}</div></div>
            <div className="fact"><div className="k">{shoebox ? 'Last seen' : 'Last touch'}</div><div className="v" style={{ fontSize: 14 }}>{ago(c.lastTouch)}</div></div>
            <div className="fact"><div className="k">{shoebox ? 'Joined' : 'Added'}</div><div className="v" style={{ fontSize: 14 }}>{c.joinedAt ? shortDate(c.joinedAt) : '—'}</div></div>
            {c.facts.map((f) => <div key={f.label} className="fact"><div className="k">{f.label}</div><div className="v" style={{ fontSize: 14 }}>{f.value}</div></div>)}
          </div>
          {c.tags && c.tags.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: -10 }}>{c.tags.map((t) => <span key={t} className="tag outline">{t}</span>)}</div>}

          {review && (
            <section>
              <h3>Review</h3>
              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Stars n={review.rating} />
                  <span className={'tag ' + (review.status === 'approved' ? 'good' : review.status === 'rejected' ? 'bad' : 'warn')}>{review.status === 'pending' ? 'Waiting for you' : review.status[0].toUpperCase() + review.status.slice(1)}</span>
                </div>
                <p style={{ margin: '8px 0', fontSize: 13.5, lineHeight: 1.5 }}>“{review.body}”</p>
                <div className="faint" style={{ fontSize: 12 }}>{review.name}{review.role ? `, ${review.role}` : ''} · {ago(review.at)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {review.status !== 'approved' && <button className="btn btn-sm btn-primary" onClick={() => act('setReview', id, 'approved')}><Icon name="check" /> Approve</button>}
                  {review.status !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => act('setReview', id, 'rejected')}><Icon name="x" /> Reject</button>}
                </div>
                <p className="faint" style={{ fontSize: 11.5, margin: '10px 0 0' }}>Approve or reject by content (spam, abuse, personal info), never by the star rating.</p>
              </div>
            </section>
          )}

          {deals.length > 0 && (
            <section>
              <h3>{data.words.deals[0].toUpperCase() + data.words.deals.slice(1)}</h3>
              <div className="rows">
                {deals.map((d) => (
                  <div key={d.id} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                    <div><div className="t">{d.title}</div><div className="s">{stageOf(data, d.stage)?.name}{d.due && d.stage !== data.wonStage ? ` · closes ${shortDate(d.due)}` : d.closedAt ? ` · ${shortDate(d.closedAt)}` : ''}</div></div>
                    <div className="r"><b>{fullMoney(d.value)}</b></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {c.devices && c.devices.some((d) => !d.revoked) && (
            <section>
              <h3>Devices</h3>
              <div className="rows">
                {c.devices.filter((d) => !d.revoked).slice(0, allDevices ? 50 : 4).map((d, i) => (
                  <div key={i} className="row" style={{ gridTemplateColumns: '28px minmax(0,1fr) auto' }}>
                    <span className="ic" style={{ color: 'var(--ink-3)' }}><Icon name={/iPhone|Android|iOS/.test(d.label) ? 'phone' : 'dashboard'} size={16} /></span>
                    <div><div className="t">{d.label}</div><div className="s">First used {d.createdAt ? shortDate(d.createdAt) : '—'}{d.revoked ? ' · signed out' : ''}</div></div>
                    <div className="r"><small>{d.lastSeen && Date.now() - d.lastSeen < 5 * 60_000 ? <span className="tag good">Online</span> : ago(d.lastSeen)}</small></div>
                  </div>
                ))}
              </div>
              {c.devices.filter((d) => !d.revoked).length > 4 && !allDevices && <button className="btn btn-sm btn-ghost" onClick={() => setAllDevices(true)}>Show all {c.devices.filter((d) => !d.revoked).length}</button>}
            </section>
          )}

          <section>
            <h3>Activity</h3>
            {data.capabilities.notes && (
              <form onSubmit={add}>
                <div style={{ marginBottom: 8 }}><Seg value={kind} options={kinds} onChange={setKind} label="Kind" /></div>
                <div className="note-form">
                  <input className="input" placeholder={kind === 'task' ? 'What needs doing?' : `Add a ${kind}…`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Note" />
                  {kind === 'task' && <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 150 }} aria-label="Due date" />}
                  <button className="btn btn-primary" disabled={busy || !text.trim()}>Add</button>
                </div>
                {shoebox && <p className="faint" style={{ fontSize: 11.5, margin: '6px 0 0' }}>Internal notes. The account owner never sees them.</p>}
              </form>
            )}
            <div className="timeline">
              {timeline.length === 0 && <span className="faint">Nothing yet.</span>}
              {timeline.map((a) => (
                <div key={a.id} className="tl">
                  <span className={'o' + (a.kind === 'event' ? ' ev' : '')} />
                  <div>
                    <b style={a.done ? { textDecoration: 'line-through', color: 'var(--ink-3)' } : undefined}>{a.title}</b>
                    <small>{a.kind === 'event' ? 'Event' : a.kind[0].toUpperCase() + a.kind.slice(1)} · {ago(a.at)}{a.due ? ` · due ${shortDate(a.due)}` : ''}{a.author ? ` · ${a.author.split('@')[0]}` : ''}</small>
                    {a.body && <div className="txt">{a.body}</div>}
                  </div>
                  {a.kind === 'task' && <button className="btn btn-sm" onClick={() => act('setDone', a.id, !a.done)}>{a.done ? 'Reopen' : 'Done'}</button>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
