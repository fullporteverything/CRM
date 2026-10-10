import React from 'react'

type Point = { label: string; value: number }

const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p) * p
}

export function ColumnChart({ data, format, color = 'var(--accent)', height = 180 }: { data: Point[]; format: (n: number) => string; color?: string; height?: number }) {
  const W = 560
  const H = height
  const pad = { l: 46, r: 8, t: 10, b: 24 }
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const bw = (W - pad.l - pad.r) / data.length
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const ticks = [0, max / 2, max]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{format(t)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={d.label}>
          <rect x={pad.l + i * bw + bw * 0.18} y={y(d.value)} width={bw * 0.64} height={Math.max(0, y(0) - y(d.value))} rx={3} fill={color}>
            <title>{`${d.label}: ${format(d.value)}`}</title>
          </rect>
          <text x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

export function LineChart({ data, format, target }: { data: Point[]; format: (n: number) => string; target?: { value: number; label: string } }) {
  const W = 560
  const H = 190
  const pad = { l: 40, r: 40, t: 14, b: 24 }
  const vals = data.map((d) => d.value).concat(target ? [target.value] : [])
  const lo = Math.floor(Math.min(...vals) / 10) * 10 - 10
  const hi = Math.ceil(Math.max(...vals) / 10) * 10
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (data.length - 1)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo))
  const line = data.map((d, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(d.value)}`).join(' ')
  const area = `${line} L ${x(data.length - 1)} ${y(lo)} L ${x(0)} ${y(lo)} Z`
  const last = data[data.length - 1]
  const ticks = [lo, (lo + hi) / 2, hi]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{format(t)}</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} />
      {target && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(target.value)} y2={y(target.value)} stroke="var(--live)" strokeDasharray="4 4" />
          <text x={W - pad.r + 4} y={y(target.value) + 4} style={{ fill: 'var(--live)' }}>{format(target.value)}</text>
          <text x={pad.l + 4} y={y(target.value) - 6} style={{ fill: 'var(--live)' }}>{target.label}</text>
        </g>
      )}
      <circle cx={x(data.length - 1)} cy={y(last.value)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
      {data.map((d, i) => (
        <text key={d.label} x={x(i)} y={H - 6} textAnchor="middle">{d.label}</text>
      ))}
    </svg>
  )
}

export function Sparkline({ values, bad }: { values: number[]; bad?: boolean }) {
  const W = 80
  const H = 22
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const x = (i: number) => 2 + ((W - 4) * i) / (values.length - 1)
  const y = (v: number) => 3 + (H - 6) * (1 - (v - lo) / (hi - lo || 1))
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ')
  const color = bad ? 'var(--bad)' : 'var(--live)'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill={color} />
    </svg>
  )
}

export function HBars({ rows, format, color }: { rows: { label: string; value: number }[]; format: (n: number) => string; color?: (i: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value))
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <div key={r.label} className="bar-row">
          <span className="muted">{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: color?.(i) }} />
          </div>
          <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{format(r.value)}</span>
        </div>
      ))}
    </div>
  )
}
