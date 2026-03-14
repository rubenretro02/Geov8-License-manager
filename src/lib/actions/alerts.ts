'use server'

import { createClient } from '@/lib/supabase/server'
import { CheckLog } from '@/lib/types'
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

  let query = supabase
    .from('check_logs')
    .select(`
      *,
      licenses!check_logs_license_key_fkey (
        customer_name,
        created_by,
        admin_id,
        alert_enabled
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // Filter by status
  if (statusFilter === 'error') {
    query = query.eq('status', 'error')
  } else if (statusFilter === 'success') {
    query = query.eq('status', 'success')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching alert logs:', error)
    return []
  }

  // Filter by user permissions and type
  let filteredData: CheckLogWithLicense[] = (data as CheckLogWithLicense[]) || []

  // Filter based on role
  if (profile.role === 'user') {
    // Users see only their own created licenses
    filteredData = filteredData.filter((log) =>
      log.licenses?.created_by === profile.id
    )
  } else if (profile.role === 'admin') {
    // Admins see their team's licenses
    filteredData = filteredData.filter((log) =>
      log.licenses?.admin_id === profile.id || log.licenses?.admin_id === profile.admin_id
    )
  }
  // super_admin sees all

  // Filter by type (IP/GPS)
  if (typeFilter === 'ip') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('ip:') || msg.includes('ip location') || (msg.includes('country') && !msg.includes('gps'))
    })
  } else if (typeFilter === 'gps') {
    filteredData = filteredData.filter((log) => {
      const msg = (log.message || '').toLowerCase()
      return msg.includes('gps:') || msg.includes('coordinate') || msg.includes('gps')
    })
  }

  // Map to include customer_name
  return filteredData.map((log) => ({
    ...log,
    customer_name: log.licenses?.customer_name || null,
  }))
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
