import React, { useState } from 'react'
import { useApp } from '../state/app'
import { isWon, probOf } from '../biz/derive'
import type { Deal } from '../biz/types'
import { Avatar, Icon, Mark, Modal, Seg } from '../components/ui'
import { DAY, money, shortDate } from '../lib/format'

type Filter = 'all' | 'mine' | 'hot' | 'soon'

export function Pipeline() {
  const { data, act, openContact, query, toast } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  if (!data) return null
  const now = Date.now()
  const can = data.capabilities.moveDeals
  const q = query.trim().toLowerCase()
  const me = data.owner.initials
  const deals = data.deals.filter((d) => {
    if (q && !`${d.company} ${d.title}`.toLowerCase().includes(q)) return false
    if (filter === 'mine') return d.owner === me
    if (filter === 'hot') return !!d.hot
    if (filter === 'soon') return !isWon(data, d) && d.due != null && d.due - now < 30 * DAY
    return true
  })
  const shown = deals.filter((d) => !isWon(data, d))
  const weighted = shown.reduce((s, d) => s + d.value * probOf(data, d), 0)
  // Won lane: only recent wins, so the board stays readable.
  const lane = (id: string) => deals.filter((d) => d.stage === id && (id !== data.wonStage || (d.closedAt ?? 0) > now - 45 * DAY))
  const maxLane = Math.max(1, ...data.stages.map((s) => lane(s.id).reduce((a, d) => a + d.value, 0)))

  const move = async (deal: Deal, stage: string) => {
    if (!can || deal.stage === stage) return
    const ok = await act('moveDeal', deal.id, stage)
    if (ok) toast(`${deal.company} moved to ${data.stages.find((s) => s.id === stage)?.name}`)
  }
  const nudge = (deal: Deal, dir: -1 | 1) => {
    const i = data.stages.findIndex((s) => s.id === deal.stage)
    const next = data.stages[i + dir]
    if (next) void move(deal, next.id)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Sell · {data.words.deals}</div>
          <h1>Pipeline</h1>
          <p>{can ? <>Drag a {data.words.deal} to move it a stage, or press <span className="kbd">Alt</span> + <span className="kbd">←</span> <span className="kbd">→</span> on a focused card.</> : data.words.pipelineSub}</p>
        </div>
        {data.capabilities.addDeals && <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" /> New deal</button>}
      </div>
      <div className="toolbar">
        <Seg value={filter} onChange={setFilter} label="Filter" options={[{ value: 'all', label: `All ${data.words.deals}` }, ...(data.capabilities.addDeals ? [{ value: 'mine' as const, label: `My ${data.words.deals}` }] : []), { value: 'hot', label: data.capabilities.addDeals ? 'Hot' : 'Most likely' }, { value: 'soon', label: 'Closing in 30 days' }]} />
        <span className="summary"><b>{shown.length}</b> open · <b>{money(weighted)}</b> weighted</span>
      </div>
      <div className="board" style={{ ['--cols' as string]: data.stages.length }}>
        {data.stages.map((s) => {
          const items = lane(s.id)
          const total = items.reduce((a, d) => a + d.value, 0)
          return (
            <section
              key={s.id}
              className={'lane' + (over === s.id ? ' over' : '')}
              aria-label={`${s.name}, ${items.length}`}
              onDragOver={(e) => { if (can && dragging) { e.preventDefault(); setOver(s.id) } }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                const deal = data.deals.find((d) => d.id === dragging)
                setOver(null)
                setDragging(null)
                if (deal) void move(deal, s.id)
              }}
            >
              <div className="lane-head">
                <span className="dot" style={{ background: s.id === data.wonStage ? 'var(--good)' : 'var(--accent)' }} />
                <b>{s.name}</b>
                <span className="cnt">{items.length}</span>
                <small>{money(total)}</small>
                <span className="lane-bar" style={{ width: `${Math.max(6, (total / maxLane) * 60)}%` }} />
              </div>
              {items.map((d) => (
                <div
                  key={d.id}
                  className={'deal' + (dragging === d.id ? ' dragging' : '') + (can ? '' : ' locked')}
                  draggable={can}
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.company}, ${d.title}, ${money(d.value)}`}
                  onDragStart={(e) => { setDragging(d.id); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDragging(null); setOver(null) }}
                  onClick={() => d.contactId && openContact(d.contactId)}
                  onKeyDown={(e) => {
                    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); nudge(d, 1) }
                    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); nudge(d, -1) }
                    else if (e.key === 'Enter' && d.contactId) openContact(d.contactId)
                  }}
                >
                  <div className="deal-top">
                    <Mark name={d.company} size={28} />
                    <div style={{ minWidth: 0 }}><div className="co">{d.company}</div><div className="ti">{d.title}</div></div>
                    <Icon name="dots" size={16} />
                  </div>
                  <div className="deal-val"><b>{money(d.value)}</b><small>{Math.round(probOf(data, d) * 100)}% likely</small></div>
                  <div className="thin" style={{ marginTop: 0 }}><i style={{ width: `${probOf(data, d) * 100}%` }} /></div>
                  <div className="deal-foot">
                    <Icon name="clock" size={13} /> {d.closedAt && isWon(data, d) ? shortDate(d.closedAt) : d.due ? shortDate(d.due) : 'No date'}
                    {d.hot && !isWon(data, d) && <span className="tag bad"><Icon name="flame" size={11} /> Hot</span>}
                    {d.due != null && d.due < now && !isWon(data, d) && <span className="tag warn">Overdue</span>}
                    {d.owner && <Avatar name={d.owner} size="sm" />}
                  </div>
                </div>
              ))}
              {can && <div className="drop-hint">Drop a {data.words.deal} here</div>}
              {!can && items.length === 0 && <div className="drop-hint">None yet</div>}
            </section>
          )
        })}
      </div>
      {adding && <NewDeal onClose={() => setAdding(false)} />}
    </>
  )
}

export function NewDeal({ onClose }: { onClose: () => void }) {
  const { data, act } = useApp()
  const [title, setTitle] = useState('')
  const [contactId, setContactId] = useState('')
  const [company, setCompany] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState(data?.stages[0].id ?? 'lead')
  const [due, setDue] = useState('')
  if (!data) return null
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = data.contacts.find((x) => x.id === contactId)
    const ok = await act('addDeal', { title: title.trim(), company: company.trim() || c?.company || c?.name || 'Unnamed', value: Number(value.replace(/[$,\s]/g, '')) || 0, stage, contactId: contactId || null, due: due ? new Date(due + 'T12:00').getTime() : null })
    if (ok) onClose()
  }
  return (
    <Modal onClose={onClose} label="New deal">
      <form onSubmit={submit}>
        <h2>New deal</h2>
        <p>It goes straight onto the pipeline.</p>
        <div className="field"><label htmlFor="nd-title">What’s the deal?</label><input id="nd-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} autoFocus placeholder="e.g. Annual maintenance plan" /></div>
        <div className="row2">
          <div className="field"><label htmlFor="nd-contact">Contact</label>
            <select id="nd-contact" className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">None</option>
              {data.contacts.slice(0, 300).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="nd-co">Company</label><input id="nd-co" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} placeholder="Optional" /></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="nd-val">Value</label><input id="nd-val" className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="$0" required /></div>
          <div className="field"><label htmlFor="nd-stage">Stage</label>
            <select id="nd-stage" className="input" value={stage} onChange={(e) => setStage(e.target.value)}>{data.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
        </div>
        <div className="field"><label htmlFor="nd-due">Expected close</label><input id="nd-due" className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary"><Icon name="plus" /> Add deal</button></div>
      </form>
    </Modal>
  )
}

export function NewContact({ onClose }: { onClose: () => void }) {
  const { act } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await act('addContact', { name, email, company })) onClose()
  }
  return (
    <Modal onClose={onClose} label="Add contact">
      <form onSubmit={submit}>
        <h2>Add contact</h2>
        <p>Kept with this business, in this browser.</p>
        <div className="field"><label htmlFor="nc-name">Name</label><input id="nc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoFocus /></div>
        <div className="field"><label htmlFor="nc-email">Email</label><input id="nc-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
        <div className="field"><label htmlFor="nc-co">Company</label><input id="nc-co" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} /></div>
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary"><Icon name="plus" /> Add contact</button></div>
      </form>
    </Modal>
  )
}
