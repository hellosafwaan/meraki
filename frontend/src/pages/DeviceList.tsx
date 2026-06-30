import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createConsumer } from '@rails/actioncable'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import DeviceTypeIcon from '../components/DeviceTypeIcon'
import { fetchDevices } from '../api/devices'
import { useAuth } from '../context/AuthContext'
import type { Device, DeviceStatus } from '../types'

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

const GRID_COLS = 'minmax(170px,1.6fr) 120px 150px minmax(150px,1.4fr) 116px 110px 24px'

export default function DeviceList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentOrg, currentOrgId } = useAuth()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pulsing, setPulsing] = useState<Record<number, boolean>>({})
  const [, setTick] = useState(0)

  const { data: devices = [] } = useQuery({
    queryKey: ['devices', currentOrgId],
    queryFn: fetchDevices,
    refetchInterval: 60000,
  })

  // Relative time ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  // ActionCable live updates
  const handleBroadcast = useCallback(
    (data: { id: number; status: DeviceStatus }) => {
      queryClient.setQueryData<Device[]>(['devices', currentOrgId], (old = []) =>
        old.map((d) =>
          d.id === data.id ? { ...d, status: data.status, updated_at: new Date().toISOString() } : d
        )
      )
      setPulsing((p) => ({ ...p, [data.id]: true }))
      setTimeout(() => setPulsing((p) => { const n = { ...p }; delete n[data.id]; return n }), 1500)
    },
    [queryClient]
  )

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || devices.length === 0) return
    const cable = createConsumer(`/cable?token=${token}`)
    const subs = devices.map((d) =>
      cable.subscriptions.create(
        { channel: 'DeviceStatusChannel', device_id: d.id },
        { received: handleBroadcast }
      )
    )
    return () => { subs.forEach((s) => s.unsubscribe()); cable.disconnect() }
  }, [devices.length, handleBroadcast])

  const filtered = devices.filter((d) => {
    if (typeFilter !== 'all' && d.device_type !== typeFilter) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (search) {
      const hay = `${d.name} ${d.ip_address} ${d.location}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const count = (s: DeviceStatus) => devices.filter((d) => d.status === s).length
  const total = devices.length
  const statCards = [
    { key: 'all', label: 'Total', value: total, color: '#049fd9', active: statusFilter === 'all' },
    { key: 'online', label: 'Online', value: count('online'), color: '#22c55e', active: statusFilter === 'online' },
    { key: 'degraded', label: 'Degraded', value: count('degraded'), color: '#f59e0b', active: statusFilter === 'degraded' },
    { key: 'offline', label: 'Offline', value: count('offline'), color: '#ef4444', active: statusFilter === 'offline' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 14, overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '20px 28px 16px', borderBottom: '1px solid #1c2230', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.4px' }}>Devices</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: '#8b93a7' }}>
              Monitoring <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{total}</span> devices across your network
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #1c2230', borderRadius: 8, background: '#10141d' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'liveBlink 1.8s ease-in-out infinite' }} />
              <span style={{ fontSize: 11.5, color: '#8b93a7', fontWeight: 500 }}>Live</span>
            </div>
            {currentOrg?.role === 'admin' && (
              <button
                onClick={() => navigate('/devices/new')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, background: '#049fd9', color: '#06121a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#05b0ef')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#049fd9')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Add Device
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 40px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
            {statCards.map((s) => (
              <div
                key={s.key}
                onClick={() => setStatusFilter(s.key === 'all' ? 'all' : (statusFilter === s.key ? 'all' : s.key))}
                style={{ position: 'relative', overflow: 'hidden', padding: '16px 18px', background: '#151a24', border: '1px solid #1c2230', borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2a3142')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1c2230')}
              >
                {s.active && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: s.color }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {s.key !== 'all' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />}
                  <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.3px', color: '#8b93a7', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", color: s.key === 'all' ? '#e5e7eb' : s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b6478" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, IP, or location…"
                style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#10141d', border: '1px solid #1c2230', borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = '#049fd9')}
                onBlur={(e) => (e.target.style.borderColor = '#1c2230')}
              />
            </div>

            {[
              { value: typeFilter, onChange: setTypeFilter, options: [['all','All Types'],['router','Router'],['switch','Switch'],['access_point','Access Point'],['firewall','Firewall']] },
              { value: statusFilter, onChange: setStatusFilter, options: [['all','All Statuses'],['online','Online'],['degraded','Degraded'],['offline','Offline']] },
            ].map((sel, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <select
                  value={sel.value}
                  onChange={(e) => sel.onChange(e.target.value)}
                  style={{ padding: '8px 30px 8px 12px', background: '#10141d', border: '1px solid #1c2230', borderRadius: 8, color: '#e5e7eb', fontSize: 13, cursor: 'pointer', outline: 'none', appearance: 'none' }}
                >
                  {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            ))}

            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: '#6b7384', fontFamily: "'JetBrains Mono', monospace" }}>
              {filtered.length} / {total}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 14, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #1c2230', background: '#0f131c' }}>
              {['Name','IP Address','Type','Location','Status','Updated',''].map((h) => (
                <div key={h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 12, background: '#1a1f2b', marginBottom: 14 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b6478" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#c3cad6' }}>No devices match your filters</div>
                <div style={{ fontSize: 12.5, color: '#6b7384', marginTop: 5 }}>Try adjusting your search or clearing filters.</div>
              </div>
            ) : (
              filtered.map((d) => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/devices/${d.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 14, alignItems: 'center', padding: '8px 18px', borderBottom: '1px solid #161b27', cursor: 'pointer', animation: pulsing[d.id] ? 'rowIn 1.4s ease' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#141925')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: '#a9b2c4' }}>{d.ip_address}</div>
                  <DeviceTypeIcon type={d.device_type} />
                  <div style={{ fontSize: 12.5, color: '#a9b2c4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.location}</div>
                  <StatusBadge status={d.status} pulsing={pulsing[d.id]} />
                  <div style={{ fontSize: 12, color: '#6b7384', fontFamily: "'JetBrains Mono', monospace" }}>{relTime(d.updated_at)}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
