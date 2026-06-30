import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  network_engineer: 'Network Engineer',
  viewer: 'Viewer',
}

export default function Sidebar() {
  const { user, logout, currentOrg, setCurrentOrg } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)

  const orgs = user?.organizations ?? []

  const handleSelectOrg = (org: typeof orgs[number]) => {
    setOrgMenuOpen(false)
    if (org.id === currentOrg?.id) return
    setCurrentOrg(org)
    queryClient.clear()
    navigate('/devices')
  }

  const navItems = [
    {
      label: 'Devices', path: '/devices', exact: false,
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6.01 18H6"/><path d="M10.01 18H10"/><path d="M15 9v5"/><path d="M17.8 7.2a4 4 0 0 0-5.6 0"/></svg>,
    },
    {
      label: 'Alerts', path: '/alerts', exact: true,
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M21 8c0-2.5-2-2.7-3-9-1 6.3-3 6.5-3 9 0 3.5-1.5 4-3 5h12c-1.5-1-3-1.5-3-5Z"/></svg>,
    },
    {
      label: 'Settings', path: '/settings', exact: true,
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>,
    },
  ]

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'ME'

  return (
    <aside style={{ width: 248, flex: '0 0 248px', background: '#0c0f15', borderRight: '1px solid #1c2230', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #1c2230', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: '#049fd9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#06121a' }}>M</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>Meraki</span>
          <span style={{ fontSize: 11, color: '#6b7384' }}>Dashboard</span>
        </div>
      </div>

      {/* Org switcher */}
      <div style={{ padding: '14px 14px 6px', position: 'relative' }}>
        <div
          onClick={() => orgs.length > 0 && setOrgMenuOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', border: '1px solid #1c2230', borderRadius: 8, background: '#0f1320', cursor: orgs.length > 0 ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentOrg?.name ?? 'No organization'}</span>
            <span style={{ fontSize: 10.5, color: '#6b7384', fontFamily: "'JetBrains Mono', monospace" }}>{currentOrg?.slug ?? '—'}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: orgMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {orgMenuOpen && orgs.length > 0 && (
          <div style={{ position: 'absolute', left: 14, right: 14, top: '100%', marginTop: 4, zIndex: 20, background: '#0f1320', border: '1px solid #1c2230', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {orgs.map((org) => {
              const active = org.id === currentOrg?.id
              return (
                <div
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', cursor: 'pointer', background: active ? 'rgba(4,159,217,0.1)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#141925' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#049fd9' : '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</span>
                    <span style={{ fontSize: 10, color: '#6b7384' }}>{roleLabel[org.role] ?? org.role}</span>
                  </div>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#049fd9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.7px', color: '#5b6478', padding: '10px 10px 6px', textTransform: 'uppercase' }}>Network</div>
        {navItems.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          return (
            <a
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 10px', borderRadius: 7, fontSize: 13,
                fontWeight: active ? 600 : 500, textDecoration: 'none',
                cursor: 'pointer',
                color: active ? '#049fd9' : '#8b93a7',
                background: active ? 'rgba(4,159,217,0.13)' : 'transparent',
              }}
            >
              {item.icon}
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: 12, borderTop: '1px solid #1c2230' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8 }}>
          <div style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: '50%', background: '#1c2230', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#9aa3b5' }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email ?? ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, alignSelf: 'flex-start', padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#049fd9', background: 'rgba(4,159,217,0.12)', border: '1px solid rgba(4,159,217,0.28)' }}>
              {roleLabel[currentOrg?.role ?? ''] ?? currentOrg?.role ?? '—'}
            </span>
          </div>
          <button
            title="Log out"
            onClick={logout}
            style={{ background: 'none', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer', color: '#6b7384', display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#1c2230' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7384'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
