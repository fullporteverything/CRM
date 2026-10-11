import React, { useState } from 'react'
import { useApp } from '../state/app'
import { reports } from '../biz/derive'
import type { Range } from '../biz/derive'
import { Avatar, Empty, Seg } from '../components/ui'
import { money, plural } from '../lib/format'

// Smooth path through points (Catmull-Rom to Bézier).
function smooth(pts: [number, number][], floor = Infinity) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    c1[1] = Math.min(c1[1], floor)
    c2[1] = Math.min(c2[1], floor)
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

function AreaChart({ series, signups }: { series: { label: string; cur: number; prev: number; signups: number }[]; signups: boolean }) {
  const W = 760, H = 270, L = 44, R = 8, T = 10, B = 26
  const get = (s: (typeof series)[number]) => (signups ? s.signups : s.cur)
  const max = Math.max(1, ...series.map((s) => Math.max(get(s), signups ? 0 : s.prev)))
  const nice = (() => {
    const p = 10 ** Math.floor(Math.log10(max))
    const m = max / p
    const v = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 5 ? 5 : 10) * p
    return signups ? Math.max(4, Math.ceil(v / 4) * 4) : v
  })()
  const x = (i: number) => L + (i / Math.max(1, series.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - v / nice) * (H - T - B)
  const cur = series.map((s, i) => [x(i), y(get(s))] as [number, number])
  const prev = series.map((s, i) => [x(i), y(s.prev)] as [number, number])
  const line = smooth(cur, y(0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * nice)
  const step = Math.ceil(series.length / 12)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chart over time">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={L - 10} y={y(t) + 3.5} textAnchor="end">{signups ? Math.round(t) : money(t)}</text>
        </g>
      ))}
      {series.map((s, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{s.label}</text>)}
      <path d={`${line} L ${x(series.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill="url(#area)" />
      {!signups && <path d={smooth(prev, y(0))} fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeDasharray="4 5" />}
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

function Donut({ parts, center, sub }: { parts: { label: string; value: number; color: string }[]; center: string; sub: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  const r = 70, c = 2 * Math.PI * r
  let off = 0
  return (
    <svg viewBox="0 0 190 190" width="190" height="190" role="img" aria-label={`${center} ${sub}`}>
      <circle cx="95" cy="95" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="22" />
      {parts.map((p) => {
        const len = (p.value / total) * c
        const el = <circle key={p.label} cx="95" cy="95" r={r} fill="none" stroke={p.color} strokeWidth="22" strokeDasharray={`${Math.max(0, len - 3)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 95 95)" strokeLinecap="butt" />
        off += len
        return el
      })}
      <text x="95" y="96" textAnchor="middle" style={{ font: '800 30px var(--font)', fill: 'var(--ink)' }}>{center}</text>
      <text x="95" y="118" textAnchor="middle" style={{ font: '600 12px var(--font)', fill: 'var(--ink-3)' }}>{sub}</text>
    </svg>
  )
}

export function Reports() {
  const { data, business, openContact } = useApp()
  const [range, setRange] = useState<Range>('12m')
  if (!data) return null
  const r = reports(data, Date.now(), range)
  const shoebox = business.connector === 'shoebox'
  const noRevenue = data.revenue.length === 0
  const total = data.sources.reduce((s, p) => s + p.value, 0)
  const top = data.sources[0]
  const lbMax = Math.max(1, ...data.leaderboard.map((l) => l.value))
  const period = range === '30d' ? 'previous 30 days' : range === '90d' ? 'previous 90 days' : 'previous 12 months'
  const D = ({ v, suffix = '%' }: { v: number | null; suffix?: string }) => v == null ? <span className="delta flat">—</span> : <span className={'delta' + (v < 0 ? ' down' : v === 0 ? ' flat' : '')}>{v > 0 ? '↑' : v < 0 ? '↓' : ''} {Math.abs(v)}{suffix}</span>

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Insights</div>
          <h1>Reports</h1>
          <p>{shoebox ? 'Pass revenue, sign-ups and how people move from signing up to buying.' : 'Revenue, conversion and where your deals come from.'}</p>
        </div>
        <Seg value={range} onChange={setRange} label="Range" options={[{ value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: '12m', label: '12M' }]} />
      </div>

      <div className="grid kpis">
        <div className="card kpi"><div className="k">Revenue</div><div className="big">{money(r.rev)}</div><div className="vs"><D v={r.revDelta} /> vs {period}</div></div>
        <div className="card kpi"><div className="k">{data.words.deals[0].toUpperCase() + data.words.deals.slice(1)} won</div><div className="big">{r.won}</div><div className="vs"><D v={r.wonDelta} suffix="" /> vs {period}</div></div>
        <div className="card kpi"><div className="k">{shoebox ? 'Sign-up to purchase' : 'Sales cycle'}</div><div className="big">{r.cycle == null ? '—' : plural(r.cycle, 'day')}</div><div className="vs">median, for {data.words.deals} won in range</div></div>
        <div className="card kpi"><div className="k">{shoebox ? 'Accounts → pass' : 'Lead → won'}</div><div className="big">{r.conv.toFixed(1)}%</div><div className="vs">of every {data.words.deal} ever opened</div></div>
      </div>

      <div className="grid rep-mid" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-head">
            <div><h2>{noRevenue && shoebox ? 'Sign-ups over time' : 'Revenue over time'}</h2><div className="sub">{noRevenue && shoebox ? 'No pass revenue yet, so this shows new accounts.' : range === '12m' ? 'Monthly closed revenue' : 'Closed revenue'}</div></div>
            {!(noRevenue && shoebox) && <div className="legend-inline"><span><i /> This period</span><span><i className="h" /> Previous period</span></div>}
          </div>
          <AreaChart series={r.series} signups={noRevenue && shoebox} />
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Stage conversion</h2><div className="sub">{data.words.deals[0].toUpperCase() + data.words.deals.slice(1)} that reached each stage</div></div></div>
          <div className="funnel">
            {r.funnel.map((f, i) => (
              <div key={f.label} className="f">
                <div><b>{f.label}</b><small>{plural(f.count, data.words.deal, data.words.deals)}</small></div>
                <div className="track"><i style={{ width: `${Math.max(f.count ? 3 : 0, f.pct)}%`, ['--mix' as string]: `${45 + i * 12}%` }} /></div>
                <span className="pc">{f.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid rep-bot" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-head"><div><h2>{data.words.sourceTitle}</h2><div className="sub">{data.words.sourceSub}</div></div></div>
          {data.sources.length === 0 ? <Empty title="Nothing to show yet" /> : (
            <div className="donut-wrap">
              <Donut parts={data.sources} center={`${Math.round((top.value / (total || 1)) * 100)}%`} sub={top.label} />
              <div className="donut-legend">
                {data.sources.map((s) => (
                  <div key={s.label}><i style={{ background: s.color }} /><span>{s.label}</span><b>{shoebox ? s.value : money(s.value)}</b></div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-head"><div><h2>{data.words.leaderboardTitle}</h2><div className="sub">{data.words.leaderboardSub}</div></div></div>
          {data.leaderboard.length === 0 ? <Empty title="Nothing to rank yet" /> : (
            <div className="lb">
              {data.leaderboard.map((l, i) => (
                <div key={l.name + i} className="l" style={l.contactId ? { cursor: 'pointer' } : undefined} onClick={() => l.contactId && openContact(l.contactId)}>
                  <span className="rank">{i + 1}</span>
                  <Avatar name={l.name} />
                  <div className="who" style={{ minWidth: 0 }}>
                    <b>{l.name}</b><small>{l.sub}</small>
                    <div className="thin"><i style={{ width: `${(l.value / lbMax) * 100}%` }} /></div>
                  </div>
                  <span className="val">{l.unit === 'money' ? money(l.value) : l.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
