export type DeviceType = 'router' | 'switch' | 'access_point' | 'firewall'
export type DeviceStatus = 'online' | 'offline' | 'degraded'
export type UserRole = 'admin' | 'network_engineer' | 'viewer'

export interface Device {
  id: number
  name: string
  ip_address: string
  device_type: DeviceType
  location: string
  status: DeviceStatus
  created_at: string
  updated_at: string
}

export interface OrgMembership {
  id: number
  name: string
  slug: string
  role: UserRole
}

export interface User {
  email: string
  organizations: OrgMembership[]
}

export interface ConfigEntry {
  id: number
  version: number
  note: string | null
  config_data: Record<string, unknown>
  created_at: string
  pushed_by: { email: string; role: UserRole }
}

export interface DeviceEvent {
  id: number
  event_type: 'status_change' | 'config_push'
  payload: Record<string, unknown>
  created_at: string
  user: { email: string; role: UserRole } | null
}
