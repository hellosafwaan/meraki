import client from './client'
import type { Device, ConfigEntry, DeviceEvent } from '../types'

export const fetchDevices = async (): Promise<Device[]> => {
  const { data } = await client.get('/devices')
  return data
}

export const fetchDevice = async (id: string | number): Promise<Device> => {
  const { data } = await client.get(`/devices/${id}`)
  return data
}

export const fetchConfigs = async (deviceId: string | number): Promise<ConfigEntry[]> => {
  const { data } = await client.get(`/devices/${deviceId}/configs`)
  return data
}

export const fetchEvents = async (deviceId: string | number): Promise<DeviceEvent[]> => {
  const { data } = await client.get(`/devices/${deviceId}/device_events`)
  return data
}

export const createConfig = async (
  deviceId: string | number,
  payload: { config_data: Record<string, unknown>; note?: string }
): Promise<ConfigEntry> => {
  const { data } = await client.post(`/devices/${deviceId}/configs`, { config: payload })
  return data
}
