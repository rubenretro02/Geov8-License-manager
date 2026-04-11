'use server'

import { createClient } from '@/lib/supabase/server'
import { CheckLog, License } from '@/lib/types'
import { getCurrentProfile } from './licenses'

// Type for log with joined license data
interface CheckLogWithLicense extends CheckLog {
  licenses?: {
    customer_name: string | null
    created_by: string | null
    admin_id: string | null
    alert_enabled: boolean
  } | null
}

// Type for license with alerts summary
export interface LicenseAlertsSummary {
  license_key: string
  customer_name: string | null
  total_alerts: number
  failed_alerts: number
  success_alerts: number
  ip_change_alerts: number
  last_alert_at: string | null
}

// Helper to detect if a log is an IP change
export function isIpChangeLog(log: { status: string; message?: string | null }): boolean {
  // Check status first (from API)
  if (log.status === 'ip_change') return true
  // Also check message for backwards compatibility
  const msg = (log.message || '').toLowerCase()
  return msg.includes('ip change') || msg.includes('ip changed') || msg.includes('new ip') || msg.includes('different ip')
}

export async function getAlertLogs(
  statusFilter: 'all' | 'error' | 'success' = 'all',
  typeFilter: 'all' | 'ip' | 'gps' = 'all'
): Promise<CheckLog[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  // STEP 1: Get ALL licenses for this user (for auditing - not filtered by alert_enabled)
  let licensesQuery = supabase
    .from('licenses')
    .select('license_key, customer_name, created_by, admin_id, alert_enabled')

  // Filter by role
  if (profile.role === 'user') {
    licensesQuery = licensesQuery.eq('created_by', profile.id)
  } else if (profile.role === 'admin') {
    licensesQuery = licensesQuery.eq('admin_id', profile.id)
  }
  // super_admin sees all licenses

  const { data: userLicenses, error: licensesError } = await licensesQuery

  if (licensesError) {
    console.error('Error fetching licenses:', licensesError)
    return []
  }

  if (!userLicenses || userLicenses.length === 0) {
    return []
  }

  // Create map for quick lookup
  const licensesMap = new Map<string, { customer_name: string | null, alert_enabled: boolean }>()
  const licenseKeys: string[] = []

  userLicenses.forEach(l => {
    licensesMap.set(l.license_key, {
      customer_name: l.customer_name,
      alert_enabled: l.alert_enabled
    })
    licenseKeys.push(l.license_key)
  })

  // STEP 2: Get check logs for ALL user's licenses (auditing) - no limit for historical searches
  let query = supabase
    .from('check_logs')
    .select('*')
    .in('license_key', licenseKeys)
    .order('created_at', { ascending: false })

  // Filter by status - 'valid' is success, everything else is a failure
  if (statusFilter === 'error') {
    query = query.neq('status', 'valid')
  } else if (statusFilter === 'success') {
    query = query.eq('status', 'valid')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching alert logs:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Filter by type (IP/GPS) if needed
  let filteredData = data

  if (typeFilter === 'ip') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('ip') || msg.includes('country') || msg.includes('location')
    })
  } else if (typeFilter === 'gps') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('gps') || msg.includes('coordinate')
    })
  }

  // Map to include customer_name and alert_enabled status
  return filteredData.map((log) => {
    const licenseData = log.license_key ? licensesMap.get(log.license_key) : null
    return {
      ...log,
      customer_name: licenseData?.customer_name || null,
    }
  })
}

// Get alerts for a specific license
export async function getAlertsByLicense(
  licenseKey: string,
  statusFilter: 'all' | 'error' | 'success' = 'all',
  typeFilter: 'all' | 'ip' | 'gps' = 'all'
): Promise<CheckLog[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  // Verify user has access to this license
  let accessQuery = supabase
    .from('licenses')
    .select('license_key, customer_name')
    .eq('license_key', licenseKey)

  // Filter by role
  if (profile.role === 'user') {
    accessQuery = accessQuery.eq('created_by', profile.id)
  } else if (profile.role === 'admin') {
    accessQuery = accessQuery.eq('admin_id', profile.id)
  }
  // super_admin can access all

  const { data: licenseData, error: accessError } = await accessQuery.single()

  if (accessError || !licenseData) {
    console.error('Access denied or license not found:', accessError)
    return []
  }

  // Get check logs for this specific license
  let query = supabase
    .from('check_logs')
    .select('*')
    .eq('license_key', licenseKey)
    .order('created_at', { ascending: false })

  // Filter by status
  if (statusFilter === 'error') {
    query = query.neq('status', 'valid')
  } else if (statusFilter === 'success') {
    query = query.eq('status', 'valid')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching license alerts:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Filter by type (IP/GPS) if needed
  let filteredData = data

  if (typeFilter === 'ip') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('ip') || msg.includes('country') || msg.includes('location')
    })
  } else if (typeFilter === 'gps') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('gps') || msg.includes('coordinate')
    })
  }

  // Map to include customer_name
  return filteredData.map((log) => ({
    ...log,
    customer_name: licenseData.customer_name || null,
  }))
}

// Get all licenses with their alerts summary (grouped view)
export async function getLicensesWithAlertsSummary(): Promise<LicenseAlertsSummary[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  // Get all licenses for this user
  let licensesQuery = supabase
    .from('licenses')
    .select('license_key, customer_name')

  // Filter by role
  if (profile.role === 'user') {
    licensesQuery = licensesQuery.eq('created_by', profile.id)
  } else if (profile.role === 'admin') {
    licensesQuery = licensesQuery.eq('admin_id', profile.id)
  }
  // super_admin sees all

  const { data: userLicenses, error: licensesError } = await licensesQuery

  if (licensesError || !userLicenses || userLicenses.length === 0) {
    return []
  }

  const licenseKeys = userLicenses.map(l => l.license_key)

  // Create map for quick lookup of customer names
  const licenseMap = new Map<string, string | null>()
  userLicenses.forEach(l => {
    licenseMap.set(l.license_key, l.customer_name)
  })

  // Get all check logs for these licenses
  const { data: allLogs, error: logsError } = await supabase
    .from('check_logs')
    .select('license_key, status, created_at')
    .in('license_key', licenseKeys)
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching logs summary:', logsError)
    return []
  }

  // Group logs by license
  const licenseLogsMap = new Map<string, { total: number; failed: number; success: number; ipChange: number; lastAt: string | null }>()

  // Initialize with all licenses (even those with 0 logs)
  userLicenses.forEach(l => {
    licenseLogsMap.set(l.license_key, { total: 0, failed: 0, success: 0, ipChange: 0, lastAt: null })
  })

  // Get messages for IP change detection
  const { data: logsWithMessages } = await supabase
    .from('check_logs')
    .select('license_key, status, message, created_at')
    .in('license_key', licenseKeys)
    .order('created_at', { ascending: false })

  // Count logs
  logsWithMessages?.forEach(log => {
    const key = log.license_key
    if (!key) return

    const current = licenseLogsMap.get(key) || { total: 0, failed: 0, success: 0, ipChange: 0, lastAt: null }
    current.total++

    // Check if it's an IP change
    if (isIpChangeLog(log)) {
      current.ipChange++
    } else if (log.status === 'valid' || log.status === 'success') {
      current.success++
    } else {
      current.failed++
    }

    // Track most recent alert
    if (!current.lastAt || new Date(log.created_at) > new Date(current.lastAt)) {
      current.lastAt = log.created_at
    }

    licenseLogsMap.set(key, current)
  })

  // Convert to array, only include licenses that have at least 1 log
  const result: LicenseAlertsSummary[] = []

  licenseLogsMap.forEach((stats, licenseKey) => {
    if (stats.total > 0) {
      result.push({
        license_key: licenseKey,
        customer_name: licenseMap.get(licenseKey) || null,
        total_alerts: stats.total,
        failed_alerts: stats.failed,
        success_alerts: stats.success,
        ip_change_alerts: stats.ipChange,
        last_alert_at: stats.lastAt,
      })
    }
  })

  // Sort by most recent alert first
  result.sort((a, b) => {
    if (!a.last_alert_at) return 1
    if (!b.last_alert_at) return -1
    return new Date(b.last_alert_at).getTime() - new Date(a.last_alert_at).getTime()
  })

  return result
}

export async function getMonitoredLicenses(): Promise<License[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  let query = supabase
    .from('licenses')
    .select('*')
    .eq('alert_enabled', true)
    .order('created_at', { ascending: false })

  // Filter by role
  if (profile.role === 'user') {
    query = query.eq('created_by', profile.id)
  } else if (profile.role === 'admin') {
    const adminId = profile.id
    query = query.eq('admin_id', adminId)
  }
  // super_admin sees all

  const { data, error } = await query

  if (error) {
    console.error('Error fetching monitored licenses:', error)
    return []
  }

  return (data as License[]) || []
}

export async function sendTelegramAlert(
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return { success: false, error: 'Telegram bot token not configured' }
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      return { success: false, error: data.description }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending Telegram alert:', error)
    return { success: false, error: 'Failed to send Telegram message' }
  }
}

export async function formatAlertMessage(log: CheckLog, type: 'fail' | 'success'): Promise<string> {
  const icon = type === 'fail' ? '🔴' : '🟢'
  const title = type === 'fail' ? 'CHECK FAILED' : 'CHECK PASSED'

  const lines = [
    `${icon} <b>${title}</b>`,
    '',
    `📋 License: <code>${log.license_key || '--'}</code>`,
    `👤 Agent: ${log.customer_name || 'Unknown'}`,
    `🌐 IP: ${log.ip_address || '--'}`,
    `📍 Location: ${log.ip_city || '--'}, ${log.ip_state || '--'}`,
    '',
    `❌ Error: ${log.message || 'No details'}`,
    '',
    `🕐 ${new Date(log.created_at).toLocaleString()}`,
  ]

  return lines.join('\n')
}
