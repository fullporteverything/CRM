import React, { useState } from 'react'
import { useApp } from '../state/app'
import { Empty, Icon, Seg, Stars } from '../components/ui'
import type { IconName } from '../components/ui'
import type { ActivityKind } from '../biz/types'
import { ago, shortDate } from '../lib/format'

type Tab = 'todo' | 'reviews' | 'all'
const icon: Record<ActivityKind, IconName> = { note: 'note', call: 'phone', email: 'mail', meeting: 'video', task: 'task', event: 'sparkle' }

export function Activities() {
  const { data, act, openContact } = useApp()
  const pending = data?.reviews.filter((r) => r.status === 'pending').length ?? 0
  const [tab, setTab] = useState<Tab>(pending > 0 ? 'reviews' : 'todo')
  if (!data) return null
  const now = Date.now()
  const nameOf = new Map(data.contacts.map((c) => [c.id, c.name]))
  const todo = data.activities.filter((a) => (a.kind === 'task' || a.kind === 'meeting') && !a.done).sort((x, y) => (x.due ?? Infinity) - (y.due ?? Infinity))
  const reviews = [...data.reviews].sort((x, y) => Number(y.status === 'pending') - Number(x.status === 'pending') || y.at - x.at)
  const all = data.activities.slice(0, 200)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Work · Today</div>
          <h1>Activities</h1>
          <p>{data.capabilities.reviews ? 'Your tasks, reviews waiting for approval, and everything that happened.' : 'Your tasks and meetings, and everything that happened.'}</p>
        </div>
      </div>
      <div className="toolbar">
        <Seg value={tab} onChange={setTab} label="Show" options={[
          { value: 'todo', label: `To do${todo.length ? ` · ${todo.length}` : ''}` },
          ...(data.capabilities.reviews ? [{ value: 'reviews' as const, label: `Reviews${pending ? ` · ${pending}` : ''}` }] : []),
          { value: 'all', label: 'Everything' },
        ]} />
        <span className="summary">Add tasks and notes from any {data.words.contact}</span>
      </div>
      <div className="card">
        {tab === 'todo' && (todo.length === 0 ? <Empty title="Nothing to do">Open any {data.words.contact} and add a task with a due date.</Empty> : (
          <div className="act-list">
            {todo.map((a) => (
              <div key={a.id} className="act">
                <span className="ic"><Icon name={icon[a.kind]} /></span>
                <div>
                  <button className="t" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => a.contactId && openContact(a.contactId)}>{a.title}</button>
                  <div className="s">{a.contactId ? nameOf.get(a.contactId) : ''}{a.due ? ` · ${a.due < now ? 'overdue, ' : ''}due ${shortDate(a.due)}` : ''}</div>
                  {a.body && <div className="body">{a.body}</div>}
                </div>
                <div className="acts">{a.kind === 'task' && <button className="btn btn-sm" onClick={() => act('setDone', a.id, true)}><Icon name="check" /> Done</button>}</div>
              </div>
            ))}
          </div>
        ))}
        {tab === 'reviews' && (reviews.length === 0 ? <Empty title="No reviews yet">When someone leaves a review in Shoebox it shows up here for approval.</Empty> : (
          <div className="act-list">
            {reviews.map((r) => (
              <div key={r.contactId} className="act">
                <span className="ic"><Icon name="star" /></span>
                <div>
                  <div className="t"><Stars n={r.rating} /> <span style={{ marginLeft: 6 }}>{r.name}{r.role ? `, ${r.role}` : ''}</span></div>
                  <div className="s">{nameOf.get(r.contactId)} · {ago(r.at)} · <span className={'tag ' + (r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn')}>{r.status === 'pending' ? 'Waiting' : r.status}</span></div>
                  <div className="body">“{r.body}”</div>
                </div>
                <div className="acts">
                  {r.status !== 'approved' && <button className="btn btn-sm btn-primary" onClick={() => act('setReview', r.contactId, 'approved')}><Icon name="check" /> Approve</button>}
                  {r.status !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => act('setReview', r.contactId, 'rejected')}><Icon name="x" /> Reject</button>}
                </div>
              </div>
            ))}
            <p className="faint" style={{ fontSize: 12, margin: '12px 4px 2px' }}>Approve or reject on content only (spam, abuse, private details), never on the rating. Only approved reviews appear on the Shoebox homepage.</p>
          </div>
        ))}
        {tab === 'all' && (all.length === 0 ? <Empty title="Nothing yet" /> : (
          <div className="act-list">
            {all.map((a) => (
              <div key={a.id} className={'act' + (a.done ? ' done' : '')}>
                <span className="ic"><Icon name={icon[a.kind]} /></span>
                <div>
                  <button className="t" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => a.contactId && openContact(a.contactId)}>{a.title}{a.contactId && nameOf.get(a.contactId) ? ` · ${nameOf.get(a.contactId)}` : ''}</button>
                  <div className="s">{ago(a.at)}{a.author ? ` · ${a.author.split('@')[0]}` : ''}</div>
                  {a.body && <div className="body">{a.body.length > 280 ? a.body.slice(0, 280) + '…' : a.body}</div>}
                </div>
                <div />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
