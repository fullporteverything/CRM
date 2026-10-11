import React, { useState } from 'react'
import { useApp } from '../state/app'
import { Avatar, Empty, Icon, Seg, StatusTag } from '../components/ui'
import { NewContact } from './Pipeline'
import { ago, fullMoney } from '../lib/format'

type Filter = 'all' | 'customers' | 'leads' | 'risk'

export function Contacts() {
  const { data, openContact, query, setQuery, business } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const [limit, setLimit] = useState(100)
  if (!data) return null
  const q = query.trim().toLowerCase()
  const shoebox = business.connector === 'shoebox'
  const rows = data.contacts.filter((c) => {
    if (q && !`${c.name} ${c.email} ${c.company}`.toLowerCase().includes(q)) return false
    if (filter === 'customers') return c.status === 'customer'
    if (filter === 'leads') return c.status === 'lead'
    if (filter === 'risk') return c.status === 'at_risk' || c.status === 'locked'
    return true
  })
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Sell · People</div>
          <h1>{data.words.contacts}</h1>
          <p>{data.words.contactsSub}</p>
        </div>
        {data.capabilities.addContacts && <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" /> Add contact</button>}
      </div>
      <div className="toolbar">
        <Seg value={filter} onChange={setFilter} label="Filter" options={[{ value: 'all', label: 'All' }, { value: 'customers', label: 'Customers' }, { value: 'leads', label: shoebox ? 'Not started' : 'Leads' }, { value: 'risk', label: 'At risk' }]} />
        <span className="summary">{q && <button className="btn btn-sm btn-ghost" onClick={() => setQuery('')}>“{query}” <Icon name="x" /></button>} <b>{rows.length}</b> {rows.length === 1 ? data.words.contact : data.words.contacts.toLowerCase()}</span>
      </div>
      <div className="card table-card">
        {rows.length === 0 ? <Empty title={q ? 'No one matches that' : 'No one here yet'}>{data.capabilities.addContacts && !q && 'Add your first contact to get started.'}</Empty> : (
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th className="hide-sm">{shoebox ? 'Plan' : 'Company'}</th><th>Status</th><th className="r hide-sm">Lifetime value</th><th className="hide-sm">{shoebox ? 'Last seen' : 'Last touch'}</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((c) => (
                <tr key={c.id} className="click" tabIndex={0} onClick={() => openContact(c.id)} onKeyDown={(e) => e.key === 'Enter' && openContact(c.id)}>
                  <td><div className="person"><Avatar name={c.name} /><div style={{ minWidth: 0 }}><b>{c.name}</b><small>{c.email || '—'}</small></div></div></td>
                  <td className="hide-sm"><span className="co-cell"><i>{(c.company || '?')[0].toUpperCase()}</i>{c.company || '—'}</span></td>
                  <td><StatusTag status={c.status} closedLabel={shoebox ? 'Shredded' : undefined} /></td>
                  <td className="r num hide-sm"><b>{fullMoney(c.value)}</b></td>
                  <td className="faint hide-sm">{ago(c.lastTouch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length > limit && <div style={{ padding: 12, textAlign: 'center' }}><button className="btn btn-sm" onClick={() => setLimit(limit + 200)}>Show more</button></div>}
      </div>
      {adding && <NewContact onClose={() => setAdding(false)} />}
    </>
  )
}
