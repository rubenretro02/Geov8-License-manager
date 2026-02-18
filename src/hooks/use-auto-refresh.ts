'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseAutoRefreshOptions {
  /** Interval in seconds between refreshes. Default: 30 */
  intervalSeconds?: number
  /** Whether auto-refresh is enabled. Default: true */
  enabled?: boolean
}

/**
 * Hook that automatically refreshes the page data (re-runs RSC) at a given interval.
 * Only refreshes when the browser tab is visible to save resources.
 */
export function useAutoRefresh({
  intervalSeconds = 30,
  enabled = true,
}: UseAutoRefreshOptions = {}) {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current && enabled) {
        router.refresh()
      }
    }, intervalSeconds * 1000)
  }, [router, intervalSeconds, enabled])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    startInterval()

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'

      if (isVisibleRef.current) {
        // Refresh immediately when tab becomes visible, then restart interval
        router.refresh()
        startInterval()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, startInterval, router])
}
