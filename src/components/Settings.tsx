import React, { useState } from 'react'
import { useApp } from '../state/app'
import type { Connector } from '../biz/types'
import { Icon, Modal } from './ui'

const choices: { id: Connector | 'soon'; name: string; sub: string; icon: 'plug' | 'sparkle' | 'note' | 'clock'; disabled?: boolean }[] = [
  { id: 'shoebox', name: 'Shoebox', sub: 'Live accounts, passes and reviews. Sign in with a Shoebox admin account.', icon: 'plug' },
  { id: 'local', name: 'Blank CRM', sub: 'For any business. Add contacts and deals yourself; saved in this browser.', icon: 'note' },
  { id: 'demo', name: 'Sample business', sub: 'A roofing company with made-up records, to try things out.', icon: 'sparkle' },
  { id: 'soon', name: 'Stripe, Shopify or your own app', sub: 'Needs a connector written for it. See “Adding a connector” in the README.', icon: 'clock', disabled: true },
]

export function AddBusiness({ onClose }: { onClose: () => void }) {
  const { addBusiness, businesses } = useApp()
  const [pick, setPick] = useState<Connector>('local')
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const hasShoebox = businesses.some((b) => b.connector === 'shoebox')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim() || (pick === 'shoebox' ? 'Shoebox' : pick === 'demo' ? 'Kestrel Roofing' : 'My business')
    addBusiness(n, pick, pick === 'local' && owner.trim() ? { owner: owner.trim() } : undefined)
    onClose()
  }
  return (
    <Modal onClose={onClose} label="Connect a business" wide>
      <form onSubmit={submit}>
        <h2>Connect a business</h2>
        <p>Each business gets its own dashboard, pipeline, contacts and office. Switch between them from the menu next to the logo.</p>
        {choices.map((c) => (
          <button key={c.id} type="button" className="choice" aria-pressed={pick === c.id} disabled={c.disabled || (c.id === 'shoebox' && hasShoebox)} onClick={() => c.id !== 'soon' && setPick(c.id)}>
            <span className="biz-dot" style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={c.icon} size={18} /></span>
            <span><b>{c.name}</b><small>{c.id === 'shoebox' && hasShoebox ? 'Already connected.' : c.sub}</small></span>
            {pick === c.id && <Icon name="check" size={18} />}
          </button>
        ))}
        <div className="row2" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="ab-name">Business name</label>
            <input id="ab-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={pick === 'shoebox' ? 'Shoebox' : pick === 'demo' ? 'Kestrel Roofing' : 'e.g. Rivera Studio'} maxLength={40} />
          </div>
          {pick === 'local' && (
            <div className="field">
              <label htmlFor="ab-owner">Your name</label>
              <input id="ab-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Shown on your deals" maxLength={40} />
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"><Icon name="plus" /> Connect</button>
        </div>
      </form>
    </Modal>
  )
}

export function Settings({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const { businesses, business, renameBusiness, removeBusiness, signedInAs, signOut, resetSample, theme, toggleTheme } = useApp()
  const [name, setName] = useState(business.name)
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal onClose={onClose} label="Settings" wide>
      <h2>Settings</h2>
      <p>{business.name} · {business.connector === 'shoebox' ? 'live from Shoebox' : business.connector === 'demo' ? 'sample data in this browser' : 'kept in this browser'}</p>
      <div className="field">
        <label htmlFor="st-name">Business name</label>
        <div className="note-form">
          <input id="st-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button className="btn" disabled={!name.trim() || name === business.name} onClick={() => renameBusiness(business.id, name.trim())}>Save</button>
        </div>
      </div>
      {business.connector === 'shoebox' && (
        <div className="note"><Icon name="lock" /> <span>{signedInAs ? <>Signed in as <b>{signedInAs}</b>. Sessions end after 12 hours without use, and this browser appears in your Shoebox device list as “Foreman CRM”.</> : 'Not signed in.'}</span></div>
      )}
      {business.connector !== 'shoebox' && (
        <div className="note"><Icon name="info" /> <span>This business’s records live only in this browser. Clearing site data erases them.</span></div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /> {theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
        {business.connector === 'shoebox' && signedInAs && <button className="btn" onClick={() => { void signOut(); onClose() }}><Icon name="logout" /> Sign out</button>}
        {business.connector === 'demo' && <button className="btn" onClick={() => { resetSample(); onClose() }}><Icon name="refresh" /> Reset sample data</button>}
        <button className="btn" onClick={onAdd}><Icon name="plus" /> Connect another business</button>
      </div>
      {businesses.length > 1 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {!confirm ? (
            <button className="btn btn-ghost btn-danger" onClick={() => setConfirm(true)}><Icon name="trash" /> Remove {business.name} from Foreman</button>
          ) : (
            <div className="err" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
              <span>{business.connector === 'shoebox' ? 'This signs you out and removes it from this browser. Shoebox itself is untouched.' : 'This erases its records from this browser.'}</span>
              <button className="btn btn-sm btn-danger" onClick={() => { removeBusiness(business.id); onClose() }}>Remove</button>
            </div>
          )}
        </div>
      )}
      <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
    </Modal>
  )
}
