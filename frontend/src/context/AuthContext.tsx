import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, OrgMembership } from '../types'

interface AuthContextValue {
  token: string | null
  user: User | null
  currentOrg: OrgMembership | null
  currentOrgId: number | null
  login: (token: string, user: User) => void
  logout: () => void
  setCurrentOrg: (org: OrgMembership) => void
}

const AuthContext = createContext<AuthContextValue>(null!)

function loadOrg(): OrgMembership | null {
  const raw = localStorage.getItem('currentOrg')
  return raw ? JSON.parse(raw) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })
  const [currentOrg, setCurrentOrgState] = useState<OrgMembership | null>(loadOrg)

  const login = (t: string, u: User) => {
    const org = u.organizations[0] ?? null
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    if (org) localStorage.setItem('currentOrg', JSON.stringify(org))
    else localStorage.removeItem('currentOrg')
    setToken(t)
    setUser(u)
    setCurrentOrgState(org)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('currentOrg')
    setToken(null)
    setUser(null)
    setCurrentOrgState(null)
  }

  const setCurrentOrg = (org: OrgMembership) => {
    localStorage.setItem('currentOrg', JSON.stringify(org))
    setCurrentOrgState(org)
  }

  return (
    <AuthContext.Provider
      value={{ token, user, currentOrg, currentOrgId: currentOrg?.id ?? null, login, logout, setCurrentOrg }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
