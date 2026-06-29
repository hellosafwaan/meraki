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

export interface User {
  email: string
  role: UserRole
}
