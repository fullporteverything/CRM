import React, { useEffect, useState } from 'react'
import { useApp } from '../state/app'
import { dashboard, probOf, stageOf } from '../biz/derive'
import { Avatar, Icon, Mark } from '../components/ui'
import { NewDeal, NewContact } from './Pipeline'
import { greeting, money, plural, shortDate } from '../lib/format'

const laneColors = ['color-mix(in srgb, var(--accent) 30%, var(--surface-3))', 'color-mix(in srgb, var(--accent) 52%, var(--surface-3))', 'color-mix(in srgb, var(--accent) 74%, var(--surface-3))', 'var(--accent)', 'var(--accent-2)']

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const i = window.setInterval(() => setT(new Date()), 1000)
    return () => window.clearInterval(i)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  return <div className="clock-big num">{p(t.getHours())}<i>:</i>{p(t.getMinutes())}<i>:</i>{p(t.getSeconds())}</div>
}

function Timer() {
  const [on, setOn] = useState(false)
  const [base, setBase] = useState(0)
  const [start, setStart] = useState(0)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!on) return
    const i = window.setInterval(() => tick((x) => x + 1), 1000)
    return () => window.clearInterval(i)
  }, [on])
  const total = base + (on ? Date.now() - start : 0)
  const s = Math.floor(total / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <>
      <div className="clock-big num">{p(Math.floor(s / 3600))}<i>:</i>{p(Math.floor(s / 60) % 60)}<i>:</i>{p(s % 60)}</div>
      <div className="live-btns">
        <button className="round" aria-label={on ? 'Pause timer' : 'Start timer'} onClick={() => { if (on) { setBase(total); setOn(false) } else { setStart(Date.now()); setOn(true) } }}><Icon name={on ? 'pause' : 'play'} /></button>
        <button className="round teal" aria-label="Start a call timer" onClick={() => { setBase(0); setStart(Date.now()); setOn(true) }}><Icon name="phone" /></button>
        <button className="round red" aria-label="Stop and reset" onClick={() => { setOn(false); setBase(0) }}><Icon name="stop" /></button>
      </div>
    </>
  )
}

export function Dashboard() {
  const { data, business, go, openContact } = useApp()
  const [newDeal, setNewDeal] = useState(false)
  const [newContact, setNewContact] = useState(false)
  if (!data) return null
  const now = Date.now()
  const d = dashboard(data, now)
  const shoebox = business.connector === 'shoebox'
  const goalPct = d.goal > 0 ? Math.min(100, Math.round((d.revQ / d.goal) * 100)) : 0
  const side = data.heroSide.length ? data.heroSide : [
    { label: 'Win rate', value: `${d.winRate}%` },
    { label: `Avg ${data.words.deal}`, value: money(d.avgDeal) },
    { label: `${data.words.deals[0].toUpperCase() + data.words.deals.slice(1)} won`, value: String(d.wonQ.length) },
  ]
  const maxDay = Math.max(1, ...d.days.map((x) => x.value))
  const peak = d.days.reduce((m, x, i) => (x.value > d.days[m].value ? i : m), 0)
  const unit = data.words.weekMetric === 'revenue' ? money : (n: number) => String(n)
  const today = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Q{d.q.q} · Week {d.q.week} · {today}</div>
          <h1>{greeting()}, {data.owner.name}</h1>
          <p>Here’s where {business.name}’s quarter stands.</p>
        </div>
        <div className="head-actions">
          {data.capabilities.addContacts && <button className="btn" onClick={() => setNewContact(true)}><Icon name="upload" /> Add contact</button>}
          {data.capabilities.addDeals ? <button className="btn btn-primary" onClick={() => setNewDeal(true)}><Icon name="plus" /> New deal</button>
            : <button className="btn btn-primary" onClick={() => go('contacts')}><Icon name="contacts" /> {data.words.contacts}</button>}
        </div>
      </div>

      <div className="grid dash-top">
        <section className="card hero" aria-label={data.words.revenueLabel}>
          <div className="hero-main">
            <div className="hero-label">{data.words.revenueLabel}</div>
            <div className="big">{money(d.revQ)}</div>
            <div className="hero-sub">
              {d.delta == null ? <span className="delta flat">New</span> : <span className={'delta' + (d.delta < 0 ? ' down' : '')}>{d.delta >= 0 ? '↑' : '↓'} {Math.abs(d.delta)}%</span>}
              {d.delta == null ? 'nothing to compare with last quarter yet' : `${d.delta >= 0 ? 'up' : 'down'} on last quarter`}
            </div>
            <div className="hero-progress">
              <div className="bar"><i style={{ width: `${goalPct}%` }} /></div>
              <div className="meta"><span><b>{goalPct}%</b> of the {money(d.goal)} goal</span><span>{money(Math.max(0, d.goal - d.revQ))} to go</span></div>
            </div>
            <button className="hero-corner" onClick={() => go('reports')} aria-label="Open reports"><Icon name="arrowUpRight" /></button>
          </div>
          <div className="hero-side">
            {side.map((s) => <div key={s.label}><div className="k">{s.label}</div><div className="v">{s.value}</div></div>)}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Open pipeline</h2>
            <button className="card-link" onClick={() => go('pipeline')}>Open board</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span className="big">{money(d.openValue)}</span>
            <span className="faint" style={{ fontSize: 12.5 }}><b style={{ color: 'var(--ink)' }}>{d.open.length}</b> {data.words.pipelineSub2} · <b style={{ color: 'var(--ink)' }}>{money(d.weighted)}</b> weighted</span>
          </div>
          <div className="pipe-bar" aria-hidden="true">
            {d.lanes.map((l, i) => <i key={l.stage.id} style={{ flexGrow: Math.max(l.value, d.openValue * 0.02), background: laneColors[i] }} />)}
          </div>
          <div className="pipe-legend">
            {d.lanes.map((l, i) => (
              <div key={l.stage.id}>
                <span className="sw" style={{ background: laneColors[i] }} />
                <span className="n">{l.stage.name}</span>
                <span className="v">{money(l.value)}</span>
                <span className="s">{plural(l.count, data.words.deal, data.words.deals)} · {d.lanePct(l.value)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid dash-mid" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>{data.words.weekTitle}</h2>
              <div className="sub">{data.words.weekMetric === 'revenue' ? `${money(d.weekDone)} closed so far · ${money(d.forecast)} forecast` : `${plural(d.weekDone, 'sign-up')} so far this week`}</div>
            </div>
            <div className="legend-inline"><span><i /> {data.words.weekMetric === 'revenue' ? 'Closed' : 'Sign-ups'}</span><span><i className="h" /> Ahead</span></div>
          </div>
          <div className="bars">
            {d.days.map((x, i) => (
              <div key={x.label} className="col">
                <div className="stack">
                  {i === peak && x.value > 0 && <span className="tip">{unit(x.value)}</span>}
                  <div className={'b' + (x.future ? ' fore' : x.today ? ' today' : '')} style={{ height: x.future ? '22%' : `${Math.max(3, (x.value / maxDay) * 82)}%` }} title={`${x.label}: ${unit(x.value)}`} />
                </div>
                <span className={'lbl' + (x.today ? ' now' : '')}>{x.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>{shoebox ? 'Most likely to buy' : 'Hot deals'}</h2>
            <button className="card-link" onClick={() => go('pipeline')}>View all</button>
          </div>
          <div className="rows">
            {d.hot.length === 0 && <div className="empty">No open {data.words.deals}.</div>}
            {d.hot.map((x) => (
              <button key={x.id} className="row" onClick={() => x.contactId && openContact(x.contactId)}>
                <Mark name={x.company} />
                <div style={{ minWidth: 0 }}>
                  <div className="t">{x.company}</div>
                  <div className="s"><span className="dot" style={{ background: 'var(--accent)' }} /> {stageOf(data, x.stage)?.name}{x.due ? ` · closes ${shortDate(x.due)}` : ''}</div>
                </div>
                <div className="r"><b>{money(x.value)}</b><small>{Math.round(probOf(data, x) * 100)}% likely</small></div>
              </button>
            ))}
          </div>
        </section>

        <section className="card next">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <h2>Next up</h2>
            {data.nextUp && <span className="tag outline">{data.nextUp.badge}</span>}
          </div>
          {data.nextUp ? (
            <>
              <h3>{data.nextUp.title}</h3>
              <div className="when">{data.nextUp.when}</div>
              {data.nextUp.action && (
                <button className="btn btn-primary" onClick={() => {
                  const a = data.nextUp!.action!
                  if (a.to === 'contact' && a.contactId) openContact(a.contactId)
                  else go(a.to as 'activities')
                }}><Icon name={data.nextUp.action.label === 'Join call' ? 'video' : 'arrowUpRight'} /> {data.nextUp.action.label}</button>
              )}
            </>
          ) : <div className="empty" style={{ marginTop: 'auto' }}>Nothing scheduled. Add a task on any {data.words.contact}.</div>}
        </section>
      </div>

      <div className="grid dash-bot" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-head">
            <h2>{shoebox ? 'Goals' : 'Quota this quarter'}</h2>
            <button className="card-link" onClick={() => go('reports')}>{shoebox ? 'Reports' : 'Leaderboard'}</button>
          </div>
          <div className="quota">
            {data.goals.map((g) => (
              <div key={g.id} className="q">
                <Avatar name={g.label} size="sm" />
                <div>
                  <div className="top">
                    <b>{g.label}{g.you && <span className="tag outline" style={{ marginLeft: 6, height: 17 }}>You</span>}</b>
                    <span><b>{g.unit === 'money' ? money(g.value) : g.value}</b> / {g.unit === 'money' ? money(g.target) : g.target}</span>
                  </div>
                  <div className="thin"><i style={{ width: `${Math.min(100, (g.value / Math.max(1, g.target)) * 100)}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="biz-dot" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', width: 24, height: 24 }}><Icon name="sparkle" size={13} /></span>
              <h2>{data.assist.title}</h2>
            </div>
            {data.assist.badge && <span className="tag warn">{data.assist.badge}</span>}
          </div>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 10 }}>{data.assist.sub}</div>
          {data.assist.items.slice(0, 3).map((x) => (
            <button key={x.id} className="assist-item" onClick={() => (x.contactId ? openContact(x.contactId) : x.to && go(x.to as 'pipeline'))}>
              <Mark name={x.title} size={26} />
              <div style={{ minWidth: 0 }}><div className="t">{x.title}</div><div className="s">{x.sub}</div></div>
              {x.value && <b>{x.value}</b>}
            </button>
          ))}
          {data.assist.items.length > 0 && <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => go(shoebox ? 'activities' : 'pipeline')}>Review in {shoebox ? 'activities' : 'pipeline'} <Icon name="arrowUpRight" /></button>}
        </section>

        <section className="card live">
          <div className="card-head">
            <h2>{data.live.title}</h2>
            <span className="tag outline">{data.live.badge}</span>
          </div>
          {data.live.mode === 'timer' ? <Timer /> : (
            <>
              <Clock />
              <div className="live-sub"><span className="dot" style={{ background: data.live.online ? 'var(--good)' : 'var(--ink-3)', marginRight: 6 }} />{data.live.sub}</div>
              <div className="live-btns">
                <button className="round teal" aria-label="Open the office" onClick={() => go('office')}><Icon name="office" /></button>
                <button className="round" aria-label={`Open ${data.words.contacts}`} onClick={() => go('contacts')}><Icon name="contacts" /></button>
              </div>
            </>
          )}
        </section>
      </div>
      {newDeal && <NewDeal onClose={() => setNewDeal(false)} />}
      {newContact && <NewContact onClose={() => setNewContact(false)} />}
    </>
  )
}
