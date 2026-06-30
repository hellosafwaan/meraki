import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Sidebar from '../components/Sidebar'
import { fetchDevice, createDevice, updateDevice } from '../api/devices'
import { useAuth } from '../context/AuthContext'
import type { Device, DeviceType, DeviceStatus } from '../types'

const inputStyle = {
  width: '100%', padding: '9px 13px', background: '#0f131c', border: '1px solid #1c2230',
  borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#8b93a7', marginBottom: 6, display: 'block' as const }

const TYPE_OPTIONS: [DeviceType, string][] = [
  ['router', 'Router'],
  ['switch', 'Switch'],
  ['access_point', 'Access Point'],
  ['firewall', 'Firewall'],
]

const STATUS_OPTIONS: [DeviceStatus, string][] = [
  ['online', 'Online'],
  ['degraded', 'Degraded'],
  ['offline', 'Offline'],
]

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

type FormState = {
  name: string
  ip_address: string
  device_type: DeviceType
  location: string
  status: DeviceStatus
}

const EMPTY: FormState = { name: '', ip_address: '', device_type: 'router', location: '', status: 'online' }

function Selector({ label, value, options, onChange }: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, paddingRight: 32, cursor: 'pointer', appearance: 'none' }}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  )
}

export default function DeviceForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentOrg, currentOrgId } = useAuth()
  const isEdit = !!id

  useEffect(() => {
    if (currentOrg && currentOrg.role !== 'admin') navigate('/devices', { replace: true })
  }, [currentOrg, navigate])

  const { data: device } = useQuery({
    queryKey: ['device', currentOrgId, id],
    queryFn: () => fetchDevice(id!),
    enabled: isEdit,
  })

  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name,
        ip_address: device.ip_address,
        device_type: device.device_type,
        location: device.location,
        status: device.status,
      })
    }
  }, [device])

  const mutation = useMutation({
    mutationFn: (payload: FormState) =>
      isEdit ? updateDevice(id!, payload) : createDevice(payload),
    onSuccess: (saved: Device) => {
      queryClient.invalidateQueries({ queryKey: ['devices', currentOrgId] })
      navigate(`/devices/${saved.id}`)
    },
    onError: () => setError('Failed to save device. Check the fields and try again.'),
  })

  const set = (key: keyof FormState) => (v: string) => setForm(prev => ({ ...prev, [key]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('Name is required.')
    if (!IPV4.test(form.ip_address.trim())) return setError('IP Address must be a valid IPv4 address.')
    if (!form.location.trim()) return setError('Location is required.')
    mutation.mutate({ ...form, name: form.name.trim(), ip_address: form.ip_address.trim(), location: form.location.trim() })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 14, overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '16px 28px 16px', borderBottom: '1px solid #1c2230' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#6b7384', marginBottom: 14 }}>
            <span onClick={() => navigate('/devices')} style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b93a7')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7384')}>
              Devices
            </span>
            {isEdit && device && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f4658" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                <span onClick={() => navigate(`/devices/${id}`)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#8b93a7')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6b7384')}>
                  {device.name}
                </span>
              </>
            )}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f4658" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style={{ color: '#a9b2c4', fontWeight: 500 }}>{isEdit ? 'Edit Device' : 'New Device'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.4px' }}>{isEdit ? 'Edit Device' : 'Add Device'}</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#8b93a7' }}>
            {isEdit ? 'Update the device details below.' : `Register a new device in ${currentOrg?.name ?? 'this organization'}.`}
          </p>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 48px' }}>
          <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
            <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #1c2230', background: '#0f131c', fontSize: 12, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase' }}>
                Device Details
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input value={form.name} placeholder="e.g. Core Router 01" onChange={e => set('name')(e.target.value)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#049fd9')} onBlur={e => (e.target.style.borderColor = '#1c2230')} />
                </div>

                <div>
                  <label style={labelStyle}>IP Address</label>
                  <input value={form.ip_address} placeholder="e.g. 10.0.0.1" onChange={e => set('ip_address')(e.target.value)} style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }}
                    onFocus={e => (e.target.style.borderColor = '#049fd9')} onBlur={e => (e.target.style.borderColor = '#1c2230')} />
                </div>

                <Selector label="Device Type" value={form.device_type} options={TYPE_OPTIONS} onChange={set('device_type')} />

                <div>
                  <label style={labelStyle}>Location</label>
                  <input value={form.location} placeholder="e.g. HQ - Server Room" onChange={e => set('location')(e.target.value)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#049fd9')} onBlur={e => (e.target.style.borderColor = '#1c2230')} />
                </div>

                <Selector label="Status" value={form.status} options={STATUS_OPTIONS} onChange={set('status')} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="submit"
                disabled={mutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: mutation.isPending ? '#0a6e97' : '#049fd9', color: '#06121a', fontSize: 13, fontWeight: 600, border: 'none', cursor: mutation.isPending ? 'not-allowed' : 'pointer' }}
              >
                {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Device'}
              </button>
              <button
                type="button"
                onClick={() => navigate(isEdit ? `/devices/${id}` : '/devices')}
                style={{ padding: '10px 18px', borderRadius: 8, background: 'transparent', color: '#8b93a7', fontSize: 13, fontWeight: 500, border: '1px solid #1c2230', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.borderColor = '#2a3142' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b93a7'; e.currentTarget.style.borderColor = '#1c2230' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
