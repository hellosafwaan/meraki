import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import DeviceList from './pages/DeviceList'
import DeviceDetail from './pages/DeviceDetail'
import ConfigEditor from './pages/ConfigEditor'
import ComingSoon from './pages/ComingSoon'
import './index.css'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/devices" element={<ProtectedRoute><DeviceList /></ProtectedRoute>} />
            <Route path="/devices/:id" element={<ProtectedRoute><DeviceDetail /></ProtectedRoute>} />
            <Route path="/devices/:id/configs/new" element={<ProtectedRoute><ConfigEditor /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><ComingSoon title="Alerts" description="Threshold-based alerts and notification rules for device status changes will appear here." icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M21 8c0-2.5-2-2.7-3-9-1 6.3-3 6.5-3 9 0 3.5-1.5 4-3 5h12c-1.5-1-3-1.5-3-5Z"/></svg>} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><ComingSoon title="Settings" description="Organization settings, user management, and API key configuration will be available here." icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/devices" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
