import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Agent, DeptId } from '../biz/types'

// Where each department's desks are. A business's agents fill them in order.
const SLOTS: Record<DeptId, { x: number; y: number }[]> = {
  exec: [{ x: 9.6, y: 1.3 }],
  sales: [{ x: 14.2, y: 6.0 }, { x: 14.2, y: 8.8 }, { x: 17.4, y: 6.0 }, { x: 17.4, y: 8.8 }],
  ops: [{ x: 1.6, y: 3.8 }, { x: 4.4, y: 3.8 }, { x: 3.0, y: 6.8 }],
  marketing: [{ x: 13.8, y: 12.4 }, { x: 16.6, y: 12.4 }, { x: 19.4, y: 12.4 }],
  finance: [{ x: 6.8, y: 12.2 }, { x: 9.6, y: 12.2 }],
}
type Placed = { agent: Agent; desk: { x: number; y: number } }
const color = (d: DeptId) => `var(--dept-${d})`

// Isometric office drawn in SVG. World units: x runs along the back-right wall,
// y along the back-left wall, z is height. One unit is about a meter.
const S = 26
const C = 0.866
const OX = 380
const OY = 132
const W = 22
const D = 16
const H = 4.2

const P = (x: number, y: number, z = 0) => [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S] as const
const pts = (...ps: (readonly [number, number])[]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

// Planes for drawing flat things (text, panels) onto a wall or the floor, in pixels.
const BACK_WALL = `matrix(${C} 0.5 0 1 ${OX} ${OY})`
const LEFT_WALL = `matrix(${-C} 0.5 0 1 ${OX} ${OY})`
const FLOOR = `matrix(${C} 0.5 ${-C} 0.5 ${OX} ${OY})`

type BoxProps = { x: number; y: number; z?: number; w: number; d: number; h: number; top: string; fy: string; fx: string; opacity?: number }

function Box({ x, y, z = 0, w, d, h, top, fy, fx, opacity }: BoxProps) {
  return (
    <g opacity={opacity}>
      <polygon points={pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={fy} />
      <polygon points={pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h))} fill={fx} />
      <polygon points={pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={top} />
    </g>
  )
}

const zones: { dept: DeptId; x0: number; x1: number; y0: number; y1: number }[] = [
  { dept: 'ops', x0: 0.9, x1: 7.3, y0: 3.2, y1: 9.4 },
  { dept: 'sales', x0: 13.4, x1: 21.2, y0: 5.4, y1: 11.7 },
  { dept: 'marketing', x0: 13.2, x1: 21.6, y0: 11.95, y1: 15.6 },
  { dept: 'finance', x0: 6.2, x1: 12.4, y0: 11.6, y1: 15.4 },
]

const plants: [number, number][] = [
  [0.8, 1.0], [7.4, 1.0], [13.7, 1.0], [21.2, 1.3], [0.9, 9.9], [21.3, 4.6], [12.7, 10.4], [5.4, 15.2], [12.8, 15.3],
]


function Plant({ x, y }: { x: number; y: number }) {
  const [cx, cy] = P(x, y, 1.05)
  return (
    <g>
      <Box x={x - 0.25} y={y - 0.25} w={0.5} d={0.5} h={0.45} top="var(--pot)" fy="var(--pot)" fx="var(--floor-edge)" />
      <circle cx={cx - 6} cy={cy + 3} r={10} fill="var(--plant-2)" />
      <circle cx={cx + 6} cy={cy + 1} r={10} fill="var(--plant)" />
      <circle cx={cx} cy={cy - 7} r={11} fill="var(--plant)" />
    </g>
  )
}

function Window({ plane, a0, a1 }: { plane: 'left' | 'back'; a0: number; a1: number }) {
  const at = (a: number, z: number) => (plane === 'left' ? P(0, a, z) : P(a, 0, z))
  const mid = (a0 + a1) / 2
  return (
    <g>
      <polygon points={pts(at(a0, 1.1), at(a1, 1.1), at(a1, 3.5), at(a0, 3.5))} fill="var(--glass)" stroke="var(--glass-frame)" strokeWidth={1.5} />
      <polygon points={pts(at(a0, 1.1), at(a1, 1.1), at(a1, 1.6), at(a0, 1.6))} fill="var(--plant)" opacity={0.35} />
      <line x1={at(mid, 1.1)[0]} y1={at(mid, 1.1)[1]} x2={at(mid, 3.5)[0]} y2={at(mid, 3.5)[1]} stroke="var(--glass-frame)" strokeWidth={1.5} />
    </g>
  )
}

function Desk({ desk, active, paused }: { desk: { x: number; y: number }; active: boolean; paused: boolean }) {
  const { x, y } = desk
  const screen = paused ? 'var(--monitor)' : 'var(--screen)'
  return (
    <g>
      <Box x={x} y={y} w={2} d={1.1} h={0.72} top="var(--desk-top)" fy="var(--desk-a)" fx="var(--desk-b)" />
      <g className={active && !paused ? 'screen-on' : undefined}>
        <Box x={x + 0.22} y={y + 0.18} z={0.72} w={0.72} d={0.08} h={0.5} top="var(--monitor)" fy={screen} fx="var(--monitor)" />
        <Box x={x + 1.06} y={y + 0.18} z={0.72} w={0.72} d={0.08} h={0.5} top="var(--monitor)" fy={screen} fx="var(--monitor)" />
      </g>
    </g>
  )
}

function Person({ p, paused }: { p: Placed; paused: boolean }) {
  const px = p.desk.x + 1
  const py = p.desk.y + 1.75
  const [bx, by] = P(px, py - 0.1, 0.98)
  const [hx, hy] = P(px, py - 0.1, 1.55)
  return (
    <g opacity={paused ? 0.45 : 1}>
      <Box x={px - 0.35} y={py - 0.3} z={0.4} w={0.7} d={0.6} h={0.08} top="var(--chair)" fy="var(--chair)" fx="var(--chair)" />
      <g className={paused ? undefined : 'bob'}>
        <ellipse cx={bx} cy={by} rx={9.5} ry={12} fill={color(p.agent.dept)} />
        <circle cx={hx} cy={hy} r={6.5} fill="var(--skin)" />
        <path d={`M ${hx - 6.5} ${hy - 1} a 6.5 6.5 0 0 1 13 0 z`} fill="var(--chair)" />
      </g>
      <Box x={px - 0.38} y={py + 0.22} z={0.42} w={0.76} d={0.1} h={0.5} top="var(--chair)" fy="var(--chair)" fx="var(--chair)" />
    </g>
  )
}

function glassWalls() {
  const z = 2.6
  const glass = { fill: 'var(--glass)', fillOpacity: 0.28, stroke: 'var(--glass-frame)', strokeWidth: 1.2 }
  return {
    side: (
      <polygon points={pts(P(8, 0, 0), P(8, 4.4, 0), P(8, 4.4, z), P(8, 0, z))} {...glass} />
    ),
    right: (
      <polygon points={pts(P(13, 0, 0), P(13, 4.4, 0), P(13, 4.4, z), P(13, 0, z))} {...glass} />
    ),
    front: (
      <g>
        <polygon points={pts(P(8, 4.4, 0), P(10, 4.4, 0), P(10, 4.4, z), P(8, 4.4, z))} {...glass} />
        <polygon points={pts(P(11.2, 4.4, 0), P(13, 4.4, 0), P(13, 4.4, z), P(11.2, 4.4, z))} {...glass} />
        <line x1={P(10, 4.4, z)[0]} y1={P(10, 4.4, z)[1]} x2={P(11.2, 4.4, z)[0]} y2={P(11.2, 4.4, z)[1]} stroke="var(--glass-frame)" strokeWidth={1.2} />
      </g>
    ),
  }
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Handoff({ from, to, onDone }: { from: readonly [number, number]; to: readonly [number, number]; onDone: () => void }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1300)
      setT(k)
      if (k < 1) raf = requestAnimationFrame(step)
      else onDone()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [x1, y1] = from
  const [x2, y2] = to
  const mx = (x1 + x2) / 2
  const my = Math.min(y1, y2) - 60
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  const qx = (1 - e) ** 2 * x1 + 2 * (1 - e) * e * mx + e * e * x2
  const qy = (1 - e) ** 2 * y1 + 2 * (1 - e) * e * my + e * e * y2
  return (
    <g pointerEvents="none">
      <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="3 4" opacity={0.6 * (1 - t) + 0.15} />
      <circle cx={qx} cy={qy} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
    </g>
  )
}

export function Office({ agents, depts, board, onSelect, live }: {
  agents: Agent[]
  depts: Record<DeptId, string>
  board: { title: string; stats: [string, string][] }
  onSelect: (id: string) => void
  // A live simulation can say who just spoke and pass work between desks.
  live?: { talking: string[]; handoffs: { id: number; from: string; to: string }[]; done: (id: number) => void }
}) {
  // Fill each department's desks in order.
  const placed: Placed[] = []
  const used: Record<string, number> = {}
  for (const a of agents) {
    const i = used[a.dept] ?? 0
    const desk = SLOTS[a.dept][i]
    if (!desk) continue
    used[a.dept] = i + 1
    placed.push({ agent: a, desk })
  }
  // Speech bubbles: whoever needs you, then a couple of others in rotation.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 6000)
    return () => window.clearInterval(t)
  }, [])
  const urgent = placed.filter((p) => (p.agent.needsYou ?? 0) > 0).map((p) => p.agent.id)
  const others = placed.filter((p) => !urgent.includes(p.agent.id))
  const rotating = others.length ? [others[tick % others.length].agent.id, others[(tick + 5) % others.length].agent.id] : []
  const talking = live ? live.talking : [...new Set([...urgent.slice(0, 2), ...rotating])].slice(0, 3)

  const glass = glassWalls()
  const objects: { depth: number; node: ReactNode }[] = []
  for (const p of placed) {
    const active = talking.includes(p.agent.id)
    objects.push({ depth: p.desk.x + 1 + p.desk.y + 0.55, node: <Desk desk={p.desk} active={active} paused={false} /> })
    objects.push({
      depth: p.desk.x + 1 + p.desk.y + 1.75,
      node: (
        <g className="agent" onClick={() => onSelect(p.agent.id)}>
          <Person p={p} paused={false} />
        </g>
      ),
    })
  }
  plants.forEach(([x, y]) => objects.push({ depth: x + y, node: <Plant x={x} y={y} /> }))
  objects.push({ depth: 8 + 2.2, node: glass.side })
  objects.push({ depth: 13 + 2.2, node: glass.right })
  objects.push({ depth: 10.5 + 4.4, node: glass.front })
  const chairs: [number, number][] = [[1.5, 10.8], [2.6, 10.8], [3.7, 10.8], [1.5, 13.1], [2.6, 13.1], [3.7, 13.1]]
  chairs.forEach(([x, y]) =>
    objects.push({ depth: x + y + 0.3, node: <Box x={x} y={y} w={0.55} d={0.55} h={0.45} top="var(--chair)" fy="var(--chair)" fx="var(--monitor)" /> }),
  )
  objects.push({ depth: 2.8 + 12.2, node: <Box x={1.2} y={11.4} w={3.2} d={1.6} h={0.72} top="var(--desk-top)" fy="var(--desk-a)" fx="var(--desk-b)" /> })
  objects.sort((p, q) => p.depth - q.depth)

  const boardU = 14.2 * S
  const boardV = -3.7 * S

  return (
    <div className="office-wrap">
      <div className="office-scroll">
        <svg className="office" viewBox="0 0 900 650" role="img" aria-label="Isometric office showing each agent at its desk">
          <polygon points={pts(P(-0.35, D, -0.45), P(W, D, -0.45), P(W, D, 0), P(-0.35, D, 0))} fill="var(--floor-side)" />
          <polygon points={pts(P(W, -0.35, -0.45), P(W, D, -0.45), P(W, D, 0), P(W, -0.35, 0))} fill="var(--floor-edge)" />
          <polygon points={pts(P(0, 0), P(W, 0), P(W, D), P(0, D))} fill="var(--floor)" />
          <polygon points={pts(P(0, 0, 0), P(0, D, 0), P(0, D, H), P(0, 0, H))} fill="var(--wall-l)" />
          <polygon points={pts(P(0, 0, 0), P(W, 0, 0), P(W, 0, H), P(0, 0, H))} fill="var(--wall-r)" />
          <polygon points={pts(P(0, 0, H), P(0, D, H), P(-0.35, D, H), P(-0.35, -0.35, H))} fill="var(--wall-top)" />
          <polygon points={pts(P(-0.35, -0.35, H), P(W, -0.35, H), P(W, 0, H), P(0, 0, H))} fill="var(--wall-top)" />
          <polygon points={pts(P(-0.35, D, 0), P(0, D, 0), P(0, D, H), P(-0.35, D, H))} fill="var(--wall-top)" />
          <polygon points={pts(P(W, -0.35, 0), P(W, 0, 0), P(W, 0, H), P(W, -0.35, H))} fill="var(--wall-top)" />
          {[[1.0, 3.4], [4.4, 6.8], [7.8, 10.2], [11.2, 13.6]].map(([a0, a1]) => <Window key={'l' + a0} plane="left" a0={a0} a1={a1} />)}
          {[[1.2, 3.6], [4.4, 6.8], [8.6, 12.4]].map(([a0, a1]) => <Window key={'b' + a0} plane="back" a0={a0} a1={a1} />)}

          <g transform={BACK_WALL}>
            <rect x={boardU} y={boardV} width={6.4 * S} height={2.7 * S} rx={3} fill="var(--board)" />
            <text x={boardU + 10} y={boardV + 15} fill="var(--board-ink)" opacity={0.6} style={{ font: '700 7.5px var(--font)', letterSpacing: '0.12em' }}>
              {board.title.toUpperCase()}
            </text>
            {board.stats.slice(0, 3).map(([k, v], i) => (
              <g key={k}>
                <text x={boardU + 10 + i * 52} y={boardV + 32} fill="var(--board-ink)" opacity={0.6} style={{ font: '500 7px var(--font)' }}>{k}</text>
                <text x={boardU + 10 + i * 52} y={boardV + 52} fill="var(--board-ink)" style={{ font: '800 17px var(--font)' }} className="num">{v}</text>
              </g>
            ))}
          </g>

          <g transform={LEFT_WALL}>
            <circle cx={9 * S} cy={-3.2 * S} r={10} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth={1.5} />
            <line x1={9 * S} y1={-3.2 * S} x2={9 * S} y2={-3.2 * S - 6} stroke="var(--ink-2)" strokeWidth={1.5} />
            <line x1={9 * S} y1={-3.2 * S} x2={9 * S + 4.5} y2={-3.2 * S + 1} stroke="var(--ink-2)" strokeWidth={1.5} />
          </g>

          {zones.map((z) => (
            <g key={z.dept}>
              <polygon points={pts(P(z.x0, z.y0), P(z.x1, z.y0), P(z.x1, z.y1), P(z.x0, z.y1))} fill={color(z.dept)} fillOpacity={0.12} stroke={color(z.dept)} strokeOpacity={0.35} />
              <g transform={FLOOR}>
                <text x={(z.x0 + 0.3) * S} y={(z.y1 - 0.22) * S} className="zone-label" fill={color(z.dept)}>{depts[z.dept]}</text>
              </g>
            </g>
          ))}
          <polygon points={pts(P(8, 0), P(13, 0), P(13, 4.4), P(8, 4.4))} fill="var(--dept-exec)" fillOpacity={0.1} />

          {objects.map((o, i) => <React.Fragment key={i}>{o.node}</React.Fragment>)}

          {placed.map((p) => {
            const [x, y] = P(p.desk.x + 1, p.desk.y + 1.65, 2.35)
            const label = p.agent.name
            const w = label.length * 6.4 + 26
            return (
              <g key={p.agent.id} className="agent" tabIndex={0} role="button" aria-label={`Open ${label}`}
                onClick={() => onSelect(p.agent.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(p.agent.id))}>
                <rect className="tag-bg" x={x - w / 2} y={y - 11} width={w} height={20} rx={10} />
                <circle cx={x - w / 2 + 11} cy={y - 1} r={3.5} fill={(p.agent.needsYou ?? 0) > 0 ? 'var(--warn)' : color(p.agent.dept)} />
                <text className="tag-name" x={x - w / 2 + 19} y={y + 3}>{label}</text>
              </g>
            )
          })}

          {talking.map((id) => {
            const p = placed.find((x) => x.agent.id === id)
            if (!p) return null
            const [x, y] = P(p.desk.x + 1, p.desk.y + 1.65, 2.35)
            const text = cap(short(p.agent.status, 42))
            const w = text.length * 5.6 + 20
            return (
              <g key={'b' + id} pointerEvents="none">
                <rect className="bubble-bg" x={x - w / 2} y={y - 40} width={w} height={22} rx={7} />
                <path d={`M ${x - 5} ${y - 18.5} L ${x} ${y - 13} L ${x + 5} ${y - 18.5}`} fill="var(--surface)" stroke="var(--accent)" />
                <text className="tag-status" x={x - w / 2 + 10} y={y - 25.5}>{text}</text>
              </g>
            )
          })}
          {live?.handoffs.map((h) => {
            const a = placed.find((x) => x.agent.id === h.from)
            const b = placed.find((x) => x.agent.id === h.to)
            if (!a || !b) return null
            const at = (p: Placed) => P(p.desk.x + 1, p.desk.y + 1.65, 1.62)
            return <Handoff key={h.id} from={at(a)} to={at(b)} onDone={() => live.done(h.id)} />
          })}
        </svg>
      </div>
      <div className="legend">
        {(Object.keys(depts) as DeptId[]).map((d) => (
          <span key={d}><i style={{ background: color(d) }} />{depts[d]} · {placed.filter((p) => p.agent.dept === d).length}</span>
        ))}
        <span className="faint">Click anyone to see what they watch</span>
      </div>
    </div>
  )
}
