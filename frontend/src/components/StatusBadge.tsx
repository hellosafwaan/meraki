import { useEffect, useRef } from 'react'
import type { DeviceStatus } from '../types'

const palette: Record<DeviceStatus, string> = {
  online: '#22c55e',
  degraded: '#f59e0b',
  offline: '#ef4444',
}

function hexAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

interface Props {
  status: DeviceStatus
  pulsing?: boolean
}

export default function StatusBadge({ status, pulsing }: Props) {
  const c = palette[status]
  const badgeRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!pulsing) return
    const badge = badgeRef.current
    const dot = dotRef.current
    if (badge) {
      badge.style.animation = 'none'
      badge.offsetHeight
      badge.style.animation = 'badgePulse 1.3s ease'
    }
    if (dot) {
      dot.style.boxShadow = `0 0 0 3px ${hexAlpha(c, 0.3)}`
      setTimeout(() => { if (dot) dot.style.boxShadow = 'none' }, 1400)
    }
  }, [pulsing, c])

  return (
    <span
      ref={badgeRef}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '2px 10px', borderRadius: 999,
        fontSize: 11, fontWeight: 600,
        color: c,
        background: hexAlpha(c, 0.12),
        border: `1px solid ${hexAlpha(c, 0.32)}`,
        textTransform: 'capitalize',
      }}
    >
      <span
        ref={dotRef}
        style={{
          width: 6, height: 6, borderRadius: 999,
          background: c, flex: '0 0 auto',
          transition: 'box-shadow .3s',
        }}
      />
      {status}
    </span>
  )
}
