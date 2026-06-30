import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createConsumer } from '@rails/actioncable'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { fetchDevice, fetchConfigs, fetchEvents, deleteDevice } from '../api/devices'
import { useAuth } from '../context/AuthContext'
import type { ConfigEntry, DeviceEvent, DeviceStatus, Device } from '../types'

// ─── Utilities ───────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  let h = d.getHours()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${mm} ${ap}`
}

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function fmtVal(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(fmtVal).join(', ') + ']'
  if (v !== null && typeof v === 'object') return JSON.stringify(v)
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

// ─── JSON Syntax Highlight ───────────────────────────────────────────────────

const JC = {
  brace: '#6b7384', key: '#5cc8ff', str: '#7ee787',
  num: '#f0a868', bool: '#d2a8ff', punct: '#4b5366',
}

function JsonPrimitive({ val }: { val: unknown }) {
  if (typeof val === 'string') return <span style={{ color: JC.str }}>"{val}"</span>
  if (typeof val === 'boolean' || val === null) return <span style={{ color: JC.bool }}>{String(val)}</span>
  return <span style={{ color: JC.num }}>{String(val)}</span>
}

function JsonHighlight({ data }: { data: Record<string, unknown> }) {
  let _key = 0
  const next = () => _key++

  const lines: JSX.Element[] = []

  function walk(val: unknown, indent: number, keyName: string | null, trailing: boolean) {
    const pad = '  '.repeat(indent)
    const id = next()
    const comma = trailing ? <span style={{ color: JC.punct }}>,</span> : null
    const keyEl = keyName != null ? (
      <><span style={{ color: JC.key }}>"{keyName}"</span><span style={{ color: JC.punct }}>: </span></>
    ) : null

    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(<div key={id} style={{ whiteSpace: 'pre' }}>{pad}{keyEl}<span style={{ color: JC.brace }}>[]</span>{comma}</div>)
      } else if (val.every(x => x === null || typeof x !== 'object')) {
        const inner = val.map((x, i) => (
          <span key={i}><JsonPrimitive val={x} />{i < val.length - 1 ? <span style={{ color: JC.punct }}>, </span> : null}</span>
        ))
        lines.push(<div key={id} style={{ whiteSpace: 'pre' }}>{pad}{keyEl}<span style={{ color: JC.brace }}>[</span>{inner}<span style={{ color: JC.brace }}>]</span>{comma}</div>)
      } else {
        lines.push(<div key={id} style={{ whiteSpace: 'pre' }}>{pad}{keyEl}<span style={{ color: JC.brace }}>[</span></div>)
        val.forEach((x, i) => walk(x, indent + 1, null, i < val.length - 1))
        lines.push(<div key={next()} style={{ whiteSpace: 'pre' }}>{pad}<span style={{ color: JC.brace }}>]</span>{comma}</div>)
      }
    } else if (val !== null && typeof val === 'object') {
      const entries = Object.entries(val as Record<string, unknown>)
      lines.push(<div key={id} style={{ whiteSpace: 'pre' }}>{pad}{keyEl}<span style={{ color: JC.brace }}>{'{'}</span></div>)
      entries.forEach(([k, v], i) => walk(v, indent + 1, k, i < entries.length - 1))
      lines.push(<div key={next()} style={{ whiteSpace: 'pre' }}>{pad}<span style={{ color: JC.brace }}>{'}'}</span>{comma}</div>)
    } else {
      lines.push(<div key={id} style={{ whiteSpace: 'pre' }}>{pad}{keyEl}<JsonPrimitive val={val} />{comma}</div>)
    }
  }

  walk(data, 0, null, false)
  return <>{lines}</>
}

// ─── Diff builder ────────────────────────────────────────────────────────────

type DiffRow = {
  key: string
  curVal: string
  prevVal: string | null
  sign: '+' | '~' | ' '
  changed: boolean
  added: boolean
}

function buildDiff(cur: Record<string, unknown>, prev: Record<string, unknown> | null): DiffRow[] {
  return Object.keys(cur).map(key => {
    const curStr = fmtVal(cur[key])
    if (!prev) return { key, curVal: curStr, prevVal: null, sign: '+', changed: false, added: true }
    const hasPrev = Object.prototype.hasOwnProperty.call(prev, key)
    const prevStr = hasPrev ? fmtVal(prev[key]) : null
    const changed = hasPrev && curStr !== prevStr
    return { key, curVal: curStr, prevVal: prevStr, sign: added(hasPrev, changed), changed, added: !hasPrev }
  })
}

function added(hasPrev: boolean, changed: boolean): '+' | '~' | ' ' {
  if (!hasPrev) return '+'
  if (changed) return '~'
  return ' '
}

// ─── Device type icon (larger, for header) ──────────────────────────────────

const DEVICE_ICONS: Record<string, JSX.Element> = {
  firewall: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
  router: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6.01 18H6"/><path d="M10.01 18H10"/><path d="M15 9v5"/><path d="M17.8 7.2a4 4 0 0 0-5.6 0"/><path d="M20.6 4.4a8 8 0 0 0-11.2 0"/></svg>,
  switch: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>,
  access_point: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/></svg>,
}

const TYPE_LABEL: Record<string, string> = {
  router: 'Router', switch: 'Switch', access_point: 'Access Point', firewall: 'Firewall',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', network_engineer: 'Network Engineer', viewer: 'Viewer',
}

const STATUS_COLOR: Record<DeviceStatus, string> = {
  online: '#22c55e', degraded: '#f59e0b', offline: '#ef4444',
}

// ─── Tab components ──────────────────────────────────────────────────────────

function ConfigTab({ configs }: { configs: ConfigEntry[] }) {
  const [copied, setCopied] = useState(false)
  const latest = configs[0]
  if (!latest) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7384', fontSize: 14 }}>
      No config has been pushed yet.
    </div>
  )

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(latest.config_data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>
      {/* JSON block */}
      <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid #1c2230', background: '#0f131c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18 22 12 16 6"/><path d="M8 6 2 12 8 18"/></svg>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#c3cad6' }}>config_data</span>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: '#6b7384' }}>application/json</span>
          </div>
          <button
            onClick={handleCopy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: '#1a1f2b', border: '1px solid #232a38', color: copied ? '#22c55e' : '#9aa3b5', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '18px 20px', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.85, overflowX: 'auto', background: 'transparent' }}>
          <JsonHighlight data={latest.config_data} />
        </pre>
      </div>

      {/* Metadata sidebar */}
      <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase', marginBottom: 16 }}>Config Metadata</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7384', marginBottom: 5 }}>Version</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 10px', borderRadius: 6, background: 'rgba(4,159,217,0.12)', border: '1px solid rgba(4,159,217,0.3)' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#049fd9' }}>#{latest.version}</span>
              <span style={{ fontSize: 10.5, color: '#5b9fc4' }}>latest</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7384', marginBottom: 5 }}>Pushed by</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: '#c3cad6' }}>{latest.pushed_by.email}</div>
            <span style={{ display: 'inline-flex', marginTop: 4, padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#049fd9', background: 'rgba(4,159,217,0.12)', border: '1px solid rgba(4,159,217,0.28)' }}>
              {ROLE_LABEL[latest.pushed_by.role] ?? latest.pushed_by.role}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7384', marginBottom: 5 }}>Pushed at</div>
            <div style={{ fontSize: 12.5, color: '#c3cad6' }}>{fmtDate(latest.created_at)}</div>
            <div style={{ fontSize: 11.5, color: '#6b7384', marginTop: 2 }}>{relTime(latest.created_at)}</div>
          </div>
          <div style={{ height: 1, background: '#1c2230' }} />
          <div>
            <div style={{ fontSize: 11, color: '#6b7384', marginBottom: 5 }}>Change note</div>
            <div style={{ fontSize: 12.5, color: '#c3cad6', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{latest.note ?? 'No note provided'}"
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryTab({ configs }: { configs: ConfigEntry[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const ordered = [...configs].sort((a, b) => b.version - a.version)
  const latest = ordered[0]

  function toggle(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (ordered.length === 0) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7384', fontSize: 14 }}>
      No configs yet.
    </div>
  )

  return (
    <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(170px,1.2fr) 150px 1fr 28px', gap: 14, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #1c2230', background: '#0f131c' }}>
        {['Version', 'Pushed by', 'When', 'Note', ''].map((h) => (
          <div key={h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>

      {ordered.map((cfg) => {
        const prev = configs.find(x => x.version === cfg.version - 1) ?? null
        const isExpanded = !!expanded[cfg.id]
        const isLatest = cfg.version === latest?.version
        const isFirst = cfg.version === 1
        const hasNote = !!cfg.note
        const diff = buildDiff(cfg.config_data, prev ? prev.config_data : null)
        const diffLabel = prev ? `v${cfg.version} ← v${prev.version}` : `v${cfg.version} (initial)`

        return (
          <div key={cfg.id}>
            <div
              onClick={() => toggle(cfg.id)}
              style={{ display: 'grid', gridTemplateColumns: '90px minmax(170px,1.2fr) 150px 1fr 28px', gap: 14, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #161b27', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#141925')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#c3cad6' }}>v{cfg.version}</span>
                {isLatest && (
                  <span style={{ padding: '1px 6px', borderRadius: 5, fontSize: 9.5, fontWeight: 700, letterSpacing: '.3px', color: '#049fd9', background: 'rgba(4,159,217,0.12)', border: '1px solid rgba(4,159,217,0.28)', textTransform: 'uppercase' }}>latest</span>
                )}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: '#a9b2c4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.pushed_by.email}
              </div>
              <div style={{ fontSize: 12, color: '#8b93a7' }}>{relTime(cfg.created_at)}</div>
              <div style={{ fontSize: 12.5, color: hasNote ? '#a9b2c4' : '#5b6478', fontStyle: hasNote ? 'normal' : 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.note ?? 'No note'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#4b5366', transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '6px 18px 18px', borderBottom: '1px solid #161b27', background: '#0d1119', animation: 'rowExpand .22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 12px', fontSize: 11, color: '#6b7384' }}>
                  <span style={{ fontWeight: 600, color: '#8b93a7' }}>Diff</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{diffLabel}</span>
                </div>
                <div style={{ border: '1px solid #1c2230', borderRadius: 9, overflow: 'hidden', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 }}>
                  {diff.map((row) => {
                    const accent = row.added ? '#22c55e' : row.changed ? '#f59e0b' : null
                    const isChanged = row.added || row.changed
                    return (
                      <div
                        key={row.key}
                        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, padding: '6px 14px', borderBottom: '1px solid #141925', background: isChanged && accent ? hexAlpha(accent, 0.06) : 'transparent', opacity: isChanged ? 1 : 0.5 }}
                      >
                        <span style={{ display: 'inline-block', width: 14, color: accent ?? '#4b5366', fontWeight: 700, flex: '0 0 auto' }}>{row.sign}</span>
                        <span style={{ color: isChanged ? '#5cc8ff' : '#6b7384' }}>{row.key}</span>
                        <span style={{ color: '#4b5366' }}>:</span>
                        <span style={{ color: isChanged ? (row.added ? '#7ee787' : '#f0c068') : '#7d8598' }}>{row.curVal}</span>
                        {row.changed && row.prevVal != null && (
                          <>
                            <span style={{ color: '#5b6478', margin: '0 6px' }}>←</span>
                            <span style={{ color: '#6b7384', textDecoration: 'line-through' }}>{row.prevVal}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                {isFirst && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#6b7384', fontStyle: 'italic' }}>
                    Initial config — no previous version to compare against. All keys shown as added.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventsTab({ events }: { events: DeviceEvent[] }) {
  if (events.length === 0) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7384', fontSize: 14 }}>
      No events yet.
    </div>
  )

  const PAL: Record<string, string> = { online: '#22c55e', degraded: '#f59e0b', offline: '#ef4444' }

  return (
    <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 230px 1fr 120px', gap: 14, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #1c2230', background: '#0f131c' }}>
        {['Type', 'Actor', 'Summary', 'Time'].map(h => (
          <div key={h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>

      {events.map((ev) => {
        const isStatus = ev.event_type === 'status_change'
        const isSystem = ev.user == null
        const ic = isStatus ? '#f59e0b' : '#049fd9'
        const payload = ev.payload as Record<string, string>

        const summary = isStatus ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono',monospace" }}>
            <span style={{ color: PAL[payload.from] ?? '#8b93a7', textTransform: 'capitalize' }}>{payload.from}</span>
            <span style={{ color: '#5b6478' }}>→</span>
            <span style={{ color: PAL[payload.to] ?? '#e5e7eb', textTransform: 'capitalize', fontWeight: 600 }}>{payload.to}</span>
          </span>
        ) : (
          <span style={{ color: '#c3cad6' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#049fd9', fontWeight: 600 }}>Pushed v{payload.version}</span>
            {payload.note
              ? <span style={{ color: '#8b93a7' }}>: {payload.note}</span>
              : <span style={{ color: '#5b6478', fontStyle: 'italic' }}> — no note</span>
            }
          </span>
        )

        return (
          <div
            key={ev.id}
            style={{ display: 'grid', gridTemplateColumns: '180px 230px 1fr 120px', gap: 14, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #161b27' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#141925')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 26, height: 26, flex: '0 0 auto', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ic, background: hexAlpha(ic, 0.13) }}>
                {isStatus
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
                }
              </span>
              <span style={{ fontSize: 12.5, color: '#c3cad6', fontWeight: 500 }}>
                {isStatus ? 'Status Change' : 'Config Push'}
              </span>
            </div>
            <div>
              {isSystem ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b93a7' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
                  System
                </span>
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#a9b2c4' }}>{ev.user?.email}</span>
              )}
            </div>
            <div style={{ fontSize: 12.5 }}>{summary}</div>
            <div style={{ fontSize: 12, color: '#6b7384', fontFamily: "'JetBrains Mono',monospace" }}>{relTime(ev.created_at)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = 'config' | 'history' | 'events'

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentOrg, currentOrgId } = useAuth()
  const [tab, setTab] = useState<TabId>('config')
  const [, setTick] = useState(0)

  const isAdmin = currentOrg?.role === 'admin'
  const canPushConfig = currentOrg?.role === 'admin' || currentOrg?.role === 'network_engineer'

  const { data: device, isLoading, isError } = useQuery({
    queryKey: ['device', currentOrgId, id],
    queryFn: () => fetchDevice(id!),
    enabled: !!id,
  })

  const { data: configs = [] } = useQuery({
    queryKey: ['configs', currentOrgId, id],
    queryFn: () => fetchConfigs(id!),
    enabled: !!id,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId, id],
    queryFn: () => fetchEvents(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDevice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', currentOrgId] })
      navigate('/devices')
    },
  })

  const handleDelete = () => {
    if (window.confirm('Delete this device? This cannot be undone.')) {
      deleteMutation.mutate()
    }
  }

  // Relative time ticker
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(timer)
  }, [])

  // ActionCable real-time status
  const handleBroadcast = useCallback((data: { id: number; status: DeviceStatus }) => {
    queryClient.setQueryData<Device>(['device', currentOrgId, id], (old) =>
      old ? { ...old, status: data.status, updated_at: new Date().toISOString() } : old
    )
  }, [queryClient, currentOrgId, id])

  useEffect(() => {
    if (!device?.id) return
    const token = localStorage.getItem('token')
    if (!token) return
    const cable = createConsumer(`/cable?token=${token}`)
    const sub = cable.subscriptions.create(
      { channel: 'DeviceStatusChannel', device_id: device.id },
      { received: handleBroadcast }
    )
    return () => { sub.unsubscribe(); cable.disconnect() }
  }, [device?.id, handleBroadcast])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7384', fontSize: 14 }}>
          Loading device…
        </main>
      </div>
    )
  }

  if (isError || !device) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#2a3142' }}>404</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#c3cad6' }}>Device not found</div>
          <button onClick={() => navigate('/devices')} style={{ marginTop: 8, padding: '8px 18px', borderRadius: 8, background: '#049fd9', color: '#06121a', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Back to Devices
          </button>
        </main>
      </div>
    )
  }

  const sc = STATUS_COLOR[device.status]

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'config', label: 'Current Config' },
    { id: 'history', label: 'Version History', count: configs.length },
    { id: 'events', label: 'Event Log', count: events.length },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 14, overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '16px 28px 0', borderBottom: '1px solid #1c2230' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#6b7384', marginBottom: 14 }}>
            <span
              onClick={() => navigate('/devices')}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b93a7')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7384')}
            >
              Devices
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f4658" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style={{ color: '#a9b2c4', fontWeight: 500 }}>{device.name}</span>
          </div>

          {/* Device title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16 }}>
            <span style={{ width: 42, height: 42, flex: '0 0 auto', borderRadius: 10, background: '#1a1f2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa3b5' }}>
              {DEVICE_ICONS[device.device_type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.4px' }}>{device.name}</h1>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: sc, background: hexAlpha(sc, 0.12), border: `1px solid ${hexAlpha(sc, 0.32)}`, textTransform: 'capitalize' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: sc, flex: '0 0 auto' }} />
                  {device.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5, fontSize: 12.5, color: '#8b93a7' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {device.location}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono',monospace", color: '#a9b2c4' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6.01 18H6"/></svg>
                  {device.ip_address}
                </span>
                <span style={{ color: '#5b6478' }}>·</span>
                <span style={{ textTransform: 'capitalize' }}>{TYPE_LABEL[device.device_type]}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate(`/devices/${device.id}/edit`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 8, background: 'transparent', color: '#8b93a7', fontSize: 13, fontWeight: 500, border: '1px solid #1c2230', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.borderColor = '#2a3142' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8b93a7'; e.currentTarget.style.borderColor = '#1c2230' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 8, background: 'transparent', color: '#8b93a7', fontSize: 13, fontWeight: 500, border: '1px solid #1c2230', cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8b93a7'; e.currentTarget.style.borderColor = '#1c2230' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </>
              )}
              {canPushConfig && (
                <button
                  onClick={() => navigate(`/devices/${device.id}/configs/new`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 8, background: '#049fd9', color: '#06121a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#05b0ef')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#049fd9')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Push Config
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'none', border: 'none', borderBottom: active ? '2px solid #049fd9' : '2px solid transparent', color: active ? '#e5e7eb' : '#8b93a7', fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: -1 }}
                >
                  {t.label}
                  {t.count != null && (
                    <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", background: active ? 'rgba(4,159,217,0.15)' : '#1a1f2b', color: active ? '#049fd9' : '#8b93a7' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 48px' }}>
          {tab === 'config' && <ConfigTab configs={configs} />}
          {tab === 'history' && <HistoryTab configs={configs} />}
          {tab === 'events' && <EventsTab events={events} />}
        </div>
      </main>
    </div>
  )
}
