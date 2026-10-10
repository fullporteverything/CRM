import React, { useState } from 'react'
import { agents, agentById, departments, shelves, sources } from '../data/agents'
import type { ShelfId } from '../data/agents'

type Sel = { kind: 'agent'; id: string } | { kind: 'shelf'; id: ShelfId }

export function Brain() {
  const [sel, setSel] = useState<Sel>({ kind: 'agent', id: 'nudger' })
  const totalMemories = shelves.reduce((s, x) => s + x.memories, 0)

  const W = 640
  const rowA = 34
  const H = agents.length * rowA + 20
  const rowS = (H - 20) / shelves.length
  const ax = 170
  const sx = 400
  const ay = (i: number) => 22 + i * rowA
  const sy = (i: number) => 10 + rowS * i + rowS / 2

  const isLit = (agentId: string, shelf: ShelfId) =>
    (sel.kind === 'agent' && sel.id === agentId) || (sel.kind === 'shelf' && sel.id === shelf)

  const panel =
    sel.kind === 'agent'
      ? {
          title: `What ${agentById[sel.id].name} reads`,
          items: agentById[sel.id].reads.flatMap((r) => shelves.find((s) => s.id === r)!.snippets.slice(0, 2)).slice(0, 5),
        }
      : {
          title: `${shelves.find((s) => s.id === sel.id)!.name}: read by ${agents.filter((a) => a.reads.includes(sel.id)).length} agents`,
          items: shelves.find((s) => s.id === sel.id)!.snippets,
        }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <h1>The Brain</h1>
          <p>One shared memory for the whole team. Every agent reads it before it acts, and every decision you make is written back into it.</p>
        </div>
        <div className="stats" style={{ minWidth: 'min(100%, 440px)', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="stat"><div className="v">{totalMemories.toLocaleString('en-US')}</div><div className="k">Memories</div></div>
          <div className="stat"><div className="v">24,860</div><div className="k">Leads with history</div></div>
          <div className="stat"><div className="v">5,927</div><div className="k">Calls transcribed</div></div>
        </div>
      </div>

      <div className="brain">
        <div className="card">
          <div className="card-head">
            <h2>Who reads what</h2>
            <span className="sub">Click an agent or a shelf</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 12 }}>Fed by</span>
            {sources.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
          <div className="table-wrap">
            <svg className="brain-graph" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520 }} role="img" aria-label="Which agents read which memory shelves">
              {agents.map((a, i) =>
                a.reads.map((r) => {
                  const j = shelves.findIndex((s) => s.id === r)
                  const lit = isLit(a.id, r)
                  const y1 = ay(i)
                  const y2 = sy(j)
                  return (
                    <path
                      key={a.id + r}
                      d={`M ${ax + 14} ${y1} C ${ax + 120} ${y1}, ${sx - 120} ${y2}, ${sx - 6} ${y2}`}
                      fill="none"
                      stroke={lit ? 'var(--accent)' : 'var(--line)'}
                      strokeWidth={lit ? 2 : 1}
                      opacity={lit ? 1 : 0.9}
                    />
                  )
                }),
              )}
              {agents.map((a, i) => {
                const lit = sel.kind === 'agent' && sel.id === a.id
                return (
                  <g key={a.id} className="node" tabIndex={0} role="button" aria-pressed={lit}
                    onClick={() => setSel({ kind: 'agent', id: a.id })}
                    onKeyDown={(e) => e.key === 'Enter' && setSel({ kind: 'agent', id: a.id })}>
                    {lit && <rect x={10} y={ay(i) - 14} width={ax + 12} height={28} rx={8} fill="var(--accent-soft)" />}
                    <text className="node-label" x={ax - 8} y={ay(i) + 4} textAnchor="end">{a.name}</text>
                    <circle cx={ax + 6} cy={ay(i)} r={6} fill={departments[a.dept].color} />
                  </g>
                )
              })}
              {shelves.map((s, j) => {
                const lit = sel.kind === 'shelf' && sel.id === s.id
                const y = sy(j)
                return (
                  <g key={s.id} className="node" tabIndex={0} role="button" aria-pressed={lit}
                    onClick={() => setSel({ kind: 'shelf', id: s.id })}
                    onKeyDown={(e) => e.key === 'Enter' && setSel({ kind: 'shelf', id: s.id })}>
                    <rect x={sx} y={y - 22} width={220} height={44} rx={9} fill={lit ? 'var(--accent-soft)' : 'var(--surface)'} stroke={lit ? 'var(--accent)' : 'var(--line)'} />
                    {[0, 1, 2, 3, 4].map((k) => (
                      <rect key={k} x={sx + 12 + k * 5} y={y - 11 + (k % 2) * 2} width={3.5} height={22 - (k % 2) * 2} rx={1} fill={k % 2 ? 'var(--ink-3)' : 'var(--accent)'} opacity={0.75} />
                    ))}
                    <text className="node-label" x={sx + 48} y={y - 2}>{s.name}</text>
                    <text className="node-sub" x={sx + 48} y={y + 13}>{s.memories.toLocaleString('en-US')} memories</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-head"><h2>{panel.title}</h2></div>
          <div className="grid" style={{ gap: 8 }}>
            {panel.items.map((m, i) => (
              <div key={i} className="memory">
                {m.text}
                <div className="src">{m.source}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
