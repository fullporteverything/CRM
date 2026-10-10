import React, { useEffect, useState } from 'react'
import { agents, departments } from './data/agents'
import { company } from './data/company'
import { AgentDrawer, BriefModal } from './components/Overlays'
import { Rail } from './components/Rail'
import { useNow, useStore } from './state/store'
import { WarRoom } from './pages/WarRoom'
import { Revival } from './pages/Revival'
import { Branches } from './pages/Branches'
import { Brain } from './pages/Brain'
import { Finance, Marketing, Operations, Sales } from './pages/Departments'

const tabs = [
  { id: 'war-room', label: 'War room' },
  { id: 'revival', label: 'Pipeline revival' },
  { id: 'branches', label: 'Branches' },
  { id: 'brain', label: 'The Brain' },
  { id: 'sep' },
  { id: 'sales', label: 'Sales', dept: 'sales' },
  { id: 'ops', label: 'Branch ops', dept: 'ops' },
  { id: 'marketing', label: 'Marketing', dept: 'marketing' },
  { id: 'finance', label: 'Finance', dept: 'finance' },
] as const

type TabId = Exclude<(typeof tabs)[number]['id'], 'sep'>
const tabIds = tabs.map((t) => t.id).filter((t) => t !== 'sep') as TabId[]

const fromHash = (): TabId => {
  const h = location.hash.slice(1) as TabId
  return tabIds.includes(h) ? h : 'war-room'
}

function Mark() {
  // A roof ridge over a bar: the Foreman mark.
  return (
    <svg className="brand-mark" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M3 14 L13 5 L23 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="6" y="17" width="14" height="3.2" rx="1.6" fill="currentColor" />
    </svg>
  )
}

export function App() {
  const { state } = useStore()
  const [tab, setTab] = useState<TabId>(fromHash)
  const [agent, setAgent] = useState<string | null>(null)
  const [brief, setBrief] = useState(false)
  const now = useNow(20_000)

  useEffect(() => {
    const h = () => setTab(fromHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const go = (id: TabId) => {
    setTab(id)
    try {
      history.replaceState(null, '', '#' + id)
    } catch {
      /* some frames refuse history changes */
    }
    window.scrollTo({ top: 0 })
  }

  const working = agents.length - state.paused.length
  const open = state.approvals.filter((a) => a.status === 'open').length

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Mark />
          <span className="brand-name">{company.product}</span>
          <span className="brand-co">{company.name}</span>
        </div>
        <nav className="tabs" aria-label="Pages">
          {tabs.map((t, i) =>
            t.id === 'sep' ? (
              <span key={i} className="tab-sep" />
            ) : (
              <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                {'dept' in t && <span className="dot" style={{ background: departments[t.dept].color }} />}
                {t.label}
              </button>
            ),
          )}
        </nav>
        <div className="top-right">
          <span className="pill"><span className="pulse" />{working}<span className="label-long">&nbsp;agents working</span></span>
          <span className="clock">{new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          <button className="btn" onClick={() => setBrief(true)}>
            Chief of Staff{open > 0 && <span className="chip accent" style={{ marginLeft: 6, padding: '0 6px' }}>{open}</span>}
          </button>
        </div>
      </header>
      <div className="shell">
        <main className="main">
          {tab === 'war-room' && <WarRoom onSelect={setAgent} onBrief={() => setBrief(true)} />}
          {tab === 'revival' && <Revival />}
          {tab === 'branches' && <Branches />}
          {tab === 'brain' && <Brain />}
          {tab === 'sales' && <Sales onSelect={setAgent} />}
          {tab === 'ops' && <Operations onSelect={setAgent} />}
          {tab === 'marketing' && <Marketing onSelect={setAgent} />}
          {tab === 'finance' && <Finance onSelect={setAgent} />}
          <p className="demo-note">Demo with made-up data. {company.name} and everyone in it are fictional, and no agent is connected to a real system yet.</p>
        </main>
        <Rail onSelect={setAgent} />
      </div>
      {agent && <AgentDrawer id={agent} onClose={() => setAgent(null)} />}
      {brief && <BriefModal onClose={() => setBrief(false)} />}
    </>
  )
}
