import client from './client'
import type { Device } from '../types'

export const fetchDevices = async (): Promise<Device[]> => {
  const { data } = await client.get('/devices')
  return data
}
