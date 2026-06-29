import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await client.post('/auth/login', { email, password })
      login(data.token, data.user)
      navigate('/devices')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f1117', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#049fd9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#06121a' }}>M</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e5e7eb', letterSpacing: '-.3px' }}>Meraki</div>
            <div style={{ fontSize: 12, color: '#6b7384' }}>Dashboard</div>
          </div>
        </div>

        <div style={{ background: '#151a24', border: '1px solid #1c2230', borderRadius: 12, padding: '28px 28px 24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#e5e7eb' }}>Sign in</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7384' }}>Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b93a7', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@meraki.dev"
                required
                style={{ width: '100%', padding: '9px 12px', background: '#10141d', border: '1px solid #1c2230', borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = '#049fd9')}
                onBlur={(e) => (e.target.style.borderColor = '#1c2230')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b93a7', marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '9px 12px', background: '#10141d', border: '1px solid #1c2230', borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = '#049fd9')}
                onBlur={(e) => (e.target.style.borderColor = '#1c2230')}
              />
            </div>

            {error && (
              <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: 4, padding: '10px', background: '#049fd9', border: 'none', borderRadius: 8, color: '#06121a', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#5b6478' }}>
          Demo: admin@meraki.dev / engineer@meraki.dev / viewer@meraki.dev — password: <span style={{ fontFamily: 'monospace' }}>password</span>
        </p>
      </div>
    </div>
  )
}
