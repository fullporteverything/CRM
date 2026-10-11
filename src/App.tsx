import React, { useEffect, useRef, useState } from 'react'
import { useApp } from './state/app'
import type { Page } from './state/app'
import { Avatar, Icon, Logo } from './components/ui'
import type { IconName } from './components/ui'
import { ContactDrawer } from './components/ContactDrawer'
import { AddBusiness, Settings } from './components/Settings'
import { SignIn } from './components/SignIn'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
import { Contacts } from './pages/Contacts'
import { Activities } from './pages/Activities'
import { Reports } from './pages/Reports'
import { OfficePage } from './pages/OfficePage'
import { ago } from './lib/format'

const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'pipeline', label: 'Pipeline', icon: 'pipeline' },
  { id: 'contacts', label: 'Contacts', icon: 'contacts' },
  { id: 'activities', label: 'Activities', icon: 'activities' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'office', label: 'War room', icon: 'office' },
]

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [open, close])
  return ref
}

function BizSwitcher({ onAdd }: { onAdd: () => void }) {
  const { businesses, business, switchTo } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const kind = (c: string) => (c === 'shoebox' ? 'Live · Shoebox' : c === 'demo' ? 'Sample data' : 'Kept in this browser')
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="biz-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={`Business: ${business.name}. Switch business`}>
        <span className="biz-dot" style={{ background: business.color + '33', color: business.color }}>{business.name[0]}</span>
        <span className="biz-name">{business.name}</span>
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="menu" role="menu" style={{ left: 0 }}>
          <div className="menu-title">Your businesses</div>
          {businesses.map((b) => (
            <button key={b.id} className="mi" role="menuitem" aria-current={b.id === business.id} onClick={() => { switchTo(b.id); setOpen(false) }}>
              <span className="biz-dot" style={{ background: b.color + '33', color: b.color }}>{b.name[0]}</span>
              <span><b style={{ fontWeight: 700 }}>{b.name}</b><small>{kind(b.connector)}</small></span>
            </button>
          ))}
          <hr />
          <button className="mi" role="menuitem" onClick={() => { setOpen(false); onAdd() }}><Icon name="plus" size={16} /> Connect another business</button>
        </div>
      )}
    </div>
  )
}

function Bell() {
  const { data, openContact } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const [seen, setSeen] = useState(() => Number(localStorage.getItem('foreman:seen') ?? 0))
  const feed = data?.office.feed ?? []
  const unread = feed.filter((f) => f.at > seen).length
  const names = new Map(data?.office.agents.map((a) => [a.id, a.name]))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} onClick={() => {
        setOpen(!open)
        const t = Date.now()
        setSeen(t)
        try { localStorage.setItem('foreman:seen', String(t)) } catch { /* blocked */ }
      }}>
        <Icon name="bell" />{unread > 0 && <span className="ping" />}
      </button>
      {open && (
        <div className="menu" style={{ right: 0, width: 340, maxHeight: 420, overflowY: 'auto' }}>
          <div className="menu-title">What your agents noticed</div>
          {feed.length === 0 && <div className="empty">Nothing yet.</div>}
          {feed.slice(0, 14).map((f) => (
            <button key={f.id} className="feed-item mi" style={{ display: 'grid' }} onClick={() => { if (f.contactId) openContact(f.contactId); setOpen(false) }}>
              <Avatar name={names.get(f.agent) ?? f.agent} size="sm" />
              <span>{f.text}<small>{names.get(f.agent) ?? 'Agent'} · {ago(f.at)}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Me({ onSettings }: { onSettings: () => void }) {
  const { data, signedInAs, signOut, business } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const name = data?.owner.name ?? 'You'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="me" onClick={() => setOpen(!open)} aria-label="Account menu" style={{ background: '#f3c9b4' }}>{data?.owner.initials ?? 'ME'}</button>
      {open && (
        <div className="menu" style={{ right: 0 }}>
          <div className="menu-title">{business.name}</div>
          <div className="mi" style={{ cursor: 'default' }}><Avatar name={name} size="sm" /><span><b style={{ fontWeight: 700 }}>{name}</b><small>{signedInAs ?? (business.connector === 'demo' ? 'Sample business' : 'Kept in this browser')}</small></span></div>
          <hr />
          <button className="mi" onClick={() => { setOpen(false); onSettings() }}><Icon name="gear" size={16} /> Settings</button>
          {signedInAs && <button className="mi" onClick={() => { setOpen(false); void signOut() }}><Icon name="logout" size={16} /> Sign out of {business.name}</button>}
        </div>
      )}
    </div>
  )
}

export function App() {
  const app = useApp()
  const { page, go, data, status, error, business, theme, toggleTheme, query, setQuery, contactId, toastMsg } = app
  const [adding, setAdding] = useState(false)
  const [settings, setSettings] = useState(false)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const openTasks = data?.activities.filter((a) => a.kind === 'task' && !a.done).length ?? 0
  const pendingReviews = data?.reviews.filter((r) => r.status === 'pending').length ?? 0
  const openDeals = data ? data.deals.filter((d) => d.stage !== data.wonStage).length : 0
  const counts: Partial<Record<Page, [number, boolean]>> = { pipeline: [openDeals, false], activities: [openTasks + pendingReviews, true] }
  const placeholder = page === 'pipeline' ? `Search ${data?.words.deals ?? 'deals'}` : `Search ${data?.words.contacts.toLowerCase() ?? 'contacts'}`

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => go('dashboard')} aria-label="Foreman, go to dashboard">
          <Logo />
          <span className="brand-name">Foreman</span>
        </button>
        <BizSwitcher onAdd={() => setAdding(true)} />
        <nav className="nav" aria-label="Pages">
          {nav.map((n) => (
            <button key={n.id} className="nav-item" aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <Icon name={n.icon} /> {n.label}
              {counts[n.id] && counts[n.id]![0] > 0 && <span className={'count' + (counts[n.id]![1] ? ' soft' : '')}>{counts[n.id]![0]}</span>}
            </button>
          ))}
        </nav>
        <div className="top-right">
          <label className="search">
            <Icon name="search" size={15} />
            <span className="sr">Search</span>
            <input ref={search} value={query} placeholder={placeholder} onChange={(e) => {
              setQuery(e.target.value)
              if (e.target.value && page !== 'contacts' && page !== 'pipeline') go('contacts')
            }} onKeyDown={(e) => e.key === 'Escape' && setQuery('')} />
            <span className="kbd">⌘K</span>
          </label>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}><Icon name={theme === 'dark' ? 'moon' : 'sun'} /></button>
          <Bell />
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings"><Icon name="gear" /></button>
          <Me onSettings={() => setSettings(true)} />
        </div>
      </header>

      {status === 'signin' && <SignIn />}
      {status === 'loading' && !data && <div className="loading"><span className="spin" /> Loading {business.name}…</div>}
      {status === 'error' && !data && (
        <div className="page"><div className="card" style={{ maxWidth: 520, margin: '10vh auto' }}>
          <div className="err"><Icon name="alert" /> {error}</div>
          <button className="btn btn-primary" onClick={() => void app.refresh()}><Icon name="refresh" /> Try again</button>
        </div></div>
      )}
      {data && (
        <main className="page">
          {page === 'dashboard' && <Dashboard />}
          {page === 'pipeline' && <Pipeline />}
          {page === 'contacts' && <Contacts />}
          {page === 'activities' && <Activities />}
          {page === 'reports' && <Reports />}
          {page === 'office' && <OfficePage />}
          <div className="foot">
            <span>{data.notice ?? `${business.name} · updated ${ago(data.updatedAt)}`}</span>
            <span>Foreman CRM</span>
          </div>
        </main>
      )}
      {contactId && data && <ContactDrawer id={contactId} />}
      {adding && <AddBusiness onClose={() => setAdding(false)} />}
      {settings && <Settings onClose={() => setSettings(false)} onAdd={() => { setSettings(false); setAdding(true) }} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  )
}
