import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Sidebar from '../components/Sidebar'
import { fetchDevice, createConfig } from '../api/devices'

// ─── Field definitions per device type ──────────────────────────────────────

type FieldDef =
  | { kind: 'text'; key: string; label: string; placeholder: string }
  | { kind: 'number'; key: string; label: string; placeholder: string }
  | { kind: 'select'; key: string; label: string; options: [string, string][] }
  | { kind: 'toggle'; key: string; label: string; on: string; off: string }
  | { kind: 'json'; key: string; label: string; placeholder: string }

const FIELDS: Record<string, FieldDef[]> = {
  access_point: [
    { kind: 'text',   key: 'ssid',     label: 'SSID',     placeholder: 'e.g. CorpNet' },
    { kind: 'select', key: 'band',     label: 'Band',     options: [['2.4GHz','2.4 GHz'], ['5GHz','5 GHz'], ['6GHz','6 GHz']] },
    { kind: 'number', key: 'channel',  label: 'Channel',  placeholder: 'e.g. 36' },
    { kind: 'select', key: 'security', label: 'Security', options: [['WPA2','WPA2'], ['WPA3','WPA3'], ['WPA2-Enterprise','WPA2-Enterprise']] },
  ],
  router: [
    { kind: 'text', key: 'wan_ip',  label: 'WAN IP',  placeholder: 'e.g. 203.0.113.1' },
    { kind: 'text', key: 'gateway', label: 'Gateway', placeholder: 'e.g. 203.0.113.254' },
    { kind: 'text', key: 'dns',     label: 'DNS',     placeholder: 'e.g. 8.8.8.8' },
  ],
  switch: [
    { kind: 'text',   key: 'vlans', label: 'VLANs', placeholder: 'Comma-separated IDs, e.g. 10, 20, 30' },
    { kind: 'toggle', key: 'stp',   label: 'Spanning Tree (STP)', on: 'Enabled', off: 'Disabled' },
  ],
  firewall: [
    { kind: 'json', key: 'rules', label: 'Rules (JSON array)', placeholder: '[{"action":"allow","src":"10.0.0.0/8","dst":"any","port":443}]' },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '9px 13px', background: '#0f131c', border: '1px solid #1c2230',
  borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#8b93a7', marginBottom: 6, display: 'block' as const }

function Field({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  switch (def.kind) {
    case 'text':
    case 'number':
      return (
        <div>
          <label style={labelStyle}>{def.label}</label>
          <input
            type={def.kind === 'number' ? 'number' : 'text'}
            value={value}
            placeholder={def.placeholder}
            onChange={e => onChange(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#049fd9')}
            onBlur={e => (e.target.style.borderColor = '#1c2230')}
          />
        </div>
      )
    case 'select':
      return (
        <div>
          <label style={labelStyle}>{def.label}</label>
          <div style={{ position: 'relative' }}>
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              style={{ ...inputStyle, paddingRight: 32, cursor: 'pointer' }}
            >
              {def.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      )
    case 'toggle':
      return (
        <div>
          <label style={labelStyle}>{def.label}</label>
          <div style={{ display: 'flex', gap: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid #1c2230', width: 'fit-content' }}>
            {[def.on, def.off].map((opt) => {
              const active = value === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: active ? '#1a2a3a' : '#0f131c', color: active ? '#049fd9' : '#6b7384', borderBottom: active ? '2px solid #049fd9' : '2px solid transparent' }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )
    case 'json':
      return (
        <div>
          <label style={labelStyle}>{def.label}</label>
          <textarea
            value={value}
            placeholder={def.placeholder}
            onChange={e => onChange(e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, lineHeight: 1.7 }}
            onFocus={e => (e.target.style.borderColor = '#049fd9')}
            onBlur={e => (e.target.style.borderColor = '#1c2230')}
          />
        </div>
      )
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConfigEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => fetchDevice(id!),
    enabled: !!id,
  })

  const fields = device ? (FIELDS[device.device_type] ?? []) : []

  const [values, setValues] = useState<Record<string, string>>({ _note: '' })

  // Populate field defaults once device/fields are known
  useEffect(() => {
    if (fields.length === 0) return
    setValues(prev => {
      const next = { ...prev }
      fields.forEach(f => {
        if (next[f.key] == null) {
          if (f.kind === 'select') next[f.key] = f.options[0][0]
          else if (f.kind === 'toggle') next[f.key] = f.on
          else next[f.key] = ''
        }
      })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.device_type])
  const [fieldError, setFieldError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: { config_data: Record<string, unknown>; note?: string }) =>
      createConfig(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs', id] })
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      navigate(`/devices/${id}`)
    },
  })

  function buildConfigData(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {}
    for (const f of fields) {
      const defaultVal = f.kind === 'select' ? f.options[0][0] : f.kind === 'toggle' ? f.on : ''
      const raw = values[f.key] ?? defaultVal
      if (f.kind === 'number') {
        const n = Number(raw)
        if (isNaN(n)) { setFieldError(`${f.label} must be a number`); return null }
        out[f.key] = n
      } else if (f.kind === 'toggle') {
        out[f.key] = raw === f.on
      } else if (f.kind === 'json') {
        try { out[f.key] = JSON.parse(raw) }
        catch { setFieldError(`${f.label} is not valid JSON`); return null }
      } else if (f.key === 'vlans') {
        // comma-separated → array of numbers
        out[f.key] = raw.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
      } else {
        out[f.key] = raw
      }
    }
    return out
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const config_data = buildConfigData()
    if (!config_data) return
    mutation.mutate({ config_data, note: values._note || undefined })
  }

  const TYPE_LABEL: Record<string, string> = {
    router: 'Router', switch: 'Switch', access_point: 'Access Point', firewall: 'Firewall',
  }

  if (isLoading || !device) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7384' }}>
          Loading…
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 14, overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '16px 28px 16px', borderBottom: '1px solid #1c2230' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#6b7384', marginBottom: 14 }}>
            <span onClick={() => navigate('/devices')} style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b93a7')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7384')}>
              Devices
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f4658" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span onClick={() => navigate(`/devices/${id}`)} style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b93a7')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7384')}>
              {device.name}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f4658" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style={{ color: '#a9b2c4', fontWeight: 500 }}>Push Config</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.4px' }}>Push Config</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#8b93a7' }}>
            {device.name} · <span style={{ textTransform: 'capitalize' }}>{TYPE_LABEL[device.device_type]}</span> · {device.ip_address}
          </p>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 48px' }}>
          <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
            <div style={{ background: '#10141d', border: '1px solid #1c2230', borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #1c2230', background: '#0f131c', fontSize: 12, fontWeight: 700, letterSpacing: '.6px', color: '#6b7384', textTransform: 'uppercase' }}>
                {TYPE_LABEL[device.device_type]} Configuration
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {fields.map(f => (
                  <Field
                    key={f.key}
                    def={f}
                    value={values[f.key] ?? (f.kind === 'select' ? f.options[0][0] : f.kind === 'toggle' ? f.on : '')}
                    onChange={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                  />
                ))}

                <div style={{ height: 1, background: '#1c2230' }} />

                <div>
                  <label style={labelStyle}>Change note <span style={{ color: '#5b6478', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text"
                    value={values._note}
                    placeholder="Describe this change…"
                    onChange={e => setValues(prev => ({ ...prev, _note: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#049fd9')}
                    onBlur={e => (e.target.style.borderColor = '#1c2230')}
                  />
                </div>
              </div>
            </div>

            {(fieldError || mutation.isError) && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                {fieldError ?? 'Failed to push config. Check the data and try again.'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="submit"
                disabled={mutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: mutation.isPending ? '#0a6e97' : '#049fd9', color: '#06121a', fontSize: 13, fontWeight: 600, border: 'none', cursor: mutation.isPending ? 'not-allowed' : 'pointer' }}
              >
                {mutation.isPending ? 'Pushing…' : 'Push Config'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/devices/${id}`)}
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
