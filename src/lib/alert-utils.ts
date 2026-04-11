// Helper to detect if a log is an IP change
export function isIpChangeLog(log: { status: string; message?: string | null }): boolean {
  // Check status first (from API)
  if (log.status === 'ip_change') return true
  // Also check message for backwards compatibility
  const msg = (log.message || '').toLowerCase()
  return msg.includes('ip change') || msg.includes('ip changed') || msg.includes('new ip') || msg.includes('different ip')
}
