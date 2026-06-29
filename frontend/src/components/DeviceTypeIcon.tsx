import type { DeviceType } from '../types'

const icons: Record<DeviceType, JSX.Element> = {
  router: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6.01 18H6"/><path d="M10.01 18H10"/>
      <path d="M15 9v5"/><path d="M17.8 7.2a4 4 0 0 0-5.6 0"/><path d="M20.6 4.4a8 8 0 0 0-11.2 0"/>
    </svg>
  ),
  switch: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/>
      <rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/>
      <path d="M12 12V8"/>
    </svg>
  ),
  access_point: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h.01"/><path d="M2 8.8a15 15 0 0 1 20 0"/>
      <path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/>
    </svg>
  ),
  firewall: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  ),
}

const labels: Record<DeviceType, string> = {
  router: 'Router',
  switch: 'Switch',
  access_point: 'Access Point',
  firewall: 'Firewall',
}

export default function DeviceTypeIcon({ type }: { type: DeviceType }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      <span style={{
        width: 26, height: 26, flex: '0 0 auto', borderRadius: 7,
        background: '#1a1f2b', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#9aa3b5',
      }}>
        {icons[type]}
      </span>
      <span style={{ fontSize: 12.5, color: '#c3cad6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {labels[type]}
      </span>
    </div>
  )
}
