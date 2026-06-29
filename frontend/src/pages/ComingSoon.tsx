import Sidebar from '../components/Sidebar'

interface Props {
  title: string
  description: string
  icon: React.ReactNode
}

export default function ComingSoon({ title, description, icon }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1117', color: '#e5e7eb', fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 14, overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '20px 28px 16px', borderBottom: '1px solid #1c2230' }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.4px' }}>{title}</h1>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#1a1f2b', color: '#5b6478', marginBottom: 20 }}>
              {icon}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#c3cad6', marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#6b7384', lineHeight: 1.6 }}>{description}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '5px 14px', borderRadius: 999, background: 'rgba(4,159,217,0.08)', border: '1px solid rgba(4,159,217,0.2)', fontSize: 12, fontWeight: 600, color: '#049fd9', letterSpacing: '.3px' }}>
              COMING SOON
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
