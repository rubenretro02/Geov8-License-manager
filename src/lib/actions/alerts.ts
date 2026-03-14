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

export async function getAlertLogs(
  statusFilter: 'all' | 'error' | 'success' = 'all',
  typeFilter: 'all' | 'ip' | 'gps' = 'all'
): Promise<CheckLog[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  // First get all check logs
  let query = supabase
    .from('check_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

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

  // Get license keys from logs
  const licenseKeys = [...new Set(data.map(log => log.license_key).filter(Boolean))]

  // Fetch license data separately
  const licensesMap = new Map<string, { customer_name: string | null, created_by: string | null, admin_id: string | null }>()

  if (licenseKeys.length > 0) {
    const { data: licenses } = await supabase
      .from('licenses')
      .select('license_key, customer_name, created_by, admin_id')
      .in('license_key', licenseKeys)

    if (licenses) {
      licenses.forEach(l => {
        licensesMap.set(l.license_key, {
          customer_name: l.customer_name,
          created_by: l.created_by,
          admin_id: l.admin_id
        })
      })
    }
  }

  // Filter by user permissions
  let filteredData = data.filter((log) => {
    const license = log.license_key ? licensesMap.get(log.license_key) : null

    if (profile.role === 'super_admin') {
      return true // Super admin sees all
    } else if (profile.role === 'admin') {
      // Admins see their team's licenses
      return license?.admin_id === profile.id
    } else {
      // Users see only their own created licenses
      return license?.created_by === profile.id
    }
  })

  // Filter by type (IP/GPS)
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
    customer_name: log.license_key ? licensesMap.get(log.license_key)?.customer_name || null : null,
  }))
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
