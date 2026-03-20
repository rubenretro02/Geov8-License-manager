import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getTelegramToken(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN
  try {
    const { data } = await getSupabase().from('app_settings').select('value').eq('key', 'telegram_bot_token').single()
    return data?.value || null
  } catch { return null }
}

interface AdminProfile {
  telegram_chat_id: string | null
  telegram_enabled: boolean
  // Admin-level filters (new fields)
  admin_alert_on_fail?: boolean
  admin_alert_on_success?: boolean
  admin_alert_ip?: boolean
  admin_alert_gps?: boolean
}

async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('telegram_chat_id, telegram_enabled, admin_alert_on_fail, admin_alert_on_success, admin_alert_ip, admin_alert_gps')
      .eq('id', userId)
      .single()
    return data || null
  } catch {
    return null
  }
}

// Detect error type from message
function detectErrorType(message: string | null): { isIpError: boolean; isGpsError: boolean } {
  if (!message) return { isIpError: false, isGpsError: false }

  const msgLower = message.toLowerCase()

  const isIpError = msgLower.includes('ip:') ||
                    msgLower.includes('ip location') ||
                    msgLower.includes('country') ||
                    msgLower.includes('ip not allowed') ||
                    (msgLower.includes('location') && !msgLower.includes('gps'))

  const isGpsError = msgLower.includes('gps:') ||
                     msgLower.includes('gps') ||
                     msgLower.includes('coordinate') ||
                     msgLower.includes('coords')

  return { isIpError, isGpsError }
}

// Check if should send based on filters
function shouldSendAlert(
  status: string,
  errorType: { isIpError: boolean; isGpsError: boolean },
  filters: {
    alertOnFail: boolean
    alertOnSuccess: boolean
    alertIp: boolean
    alertGps: boolean
  }
): boolean {
  const isFailure = status === 'error'

  // Check status filter first
  if (isFailure && !filters.alertOnFail) {
    return false
  }
  if (!isFailure && !filters.alertOnSuccess) {
    return false
  }

  // For failures, also check error type filters
  if (isFailure) {
    // If it's an IP error, check alert_ip
    if (errorType.isIpError && !filters.alertIp) {
      return false
    }
    // If it's a GPS error, check alert_gps
    if (errorType.isGpsError && !filters.alertGps) {
      return false
    }
    // If we can't detect the type, allow it through
  }

  return true
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    })
    const result = await response.json()
    if (result.ok) {
      console.log('[Notify] Sent to:', chatId)
      return true
    } else {
      console.log('[Notify] Failed to send to:', chatId, result)
      return false
    }
  } catch (err) {
    console.error('[Notify] Error sending to:', chatId, err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      license_key,
      status,
      ip,
      location,
      message,
      chat_ids,
      // New: agent-level filters from the app
      agent_alert_on_fail,
      agent_alert_on_success,
      agent_alert_ip,
      agent_alert_gps,
      // New: explicit error type from app (optional, will detect if not provided)
      error_type
    } = body

    console.log('[Notify] Received:', { license_key, status, ip, location, message, chat_ids, error_type })

    if (!license_key) {
      return NextResponse.json({ success: false, error: 'Missing license_key' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single()

    if (licenseError || !license) {
      console.log('[Notify] License not found:', license_key)
      return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 })
    }

    console.log('[Notify] License found:', license.license_key)

    // Get bot token
    const botToken = await getTelegramToken()
    if (!botToken) {
      console.log('[Notify] No bot token configured')
      return NextResponse.json({ success: false, error: 'No bot token' }, { status: 500 })
    }

    // Detect error type
    const detectedErrorType = error_type
      ? { isIpError: error_type === 'ip', isGpsError: error_type === 'gps' }
      : detectErrorType(message)

    console.log('[Notify] Error type:', detectedErrorType)

    const isFailure = status === 'error'

    // Build message
    const icon = isFailure ? '🔴' : '🟢'
    const title = isFailure ? 'CHECK FAILED' : 'CHECK PASSED'

    // Add error type indicator
    let errorTypeLabel = ''
    if (isFailure) {
      if (detectedErrorType.isIpError && detectedErrorType.isGpsError) {
        errorTypeLabel = ' [IP + GPS]'
      } else if (detectedErrorType.isIpError) {
        errorTypeLabel = ' [IP]'
      } else if (detectedErrorType.isGpsError) {
        errorTypeLabel = ' [GPS]'
      }
    }

    const msgLines = [
      `${icon} <b>${title}${errorTypeLabel}</b>`,
      '',
      `📋 License: <code>${license.license_key}</code>`,
      `👤 Agent: ${license.customer_name || 'Unknown'}`,
      `🌐 IP: ${ip || '--'}`,
      `📍 Location: ${location || '--'}`,
      '',
      `${isFailure ? '❌' : '✅'} ${message || (isFailure ? 'Check failed' : 'Ready to work!')}`,
      '',
      `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`,
    ]
    const text = msgLines.join('\n')

    let sentToAgent = 0
    let sentToAdmin = 0

    // ============================================
    // FLOW 1: SEND TO AGENT (independent of Manager toggle)
    // ============================================
    // The agent's chat_ids and filters come from the request (from App.py)
    // This is INDEPENDENT of the license.alert_enabled setting

    if (chat_ids && typeof chat_ids === 'string' && chat_ids.trim()) {
      console.log('[Notify] Processing agent alerts...')

      // Agent filters from the request (defaults if not provided)
      const agentFilters = {
        alertOnFail: agent_alert_on_fail ?? true,
        alertOnSuccess: agent_alert_on_success ?? false,
        alertIp: agent_alert_ip ?? true,
        alertGps: agent_alert_gps ?? true,
      }

      console.log('[Notify] Agent filters:', agentFilters)

      // Check if should send based on agent's own filters
      if (shouldSendAlert(status, detectedErrorType, agentFilters)) {
        const agentChatIds = chat_ids.split(',').map((id: string) => id.trim()).filter((id: string) => id)

        for (const chatId of agentChatIds) {
          const sent = await sendTelegramMessage(botToken, chatId, text)
          if (sent) sentToAgent++
        }
        console.log('[Notify] Sent to agent:', sentToAgent)
      } else {
        console.log('[Notify] Agent alert filtered out by agent preferences')
      }
    }

    // Also check configurations table for agent chat_ids (by HWID)
    if (license.hwid) {
      const { data: agentConfig } = await supabase
        .from('configurations')
        .select('telegram_enabled, telegram_chat_ids, alert_on_fail, alert_on_success, alert_ip, alert_gps')
        .eq('hardware_id', license.hwid)
        .single()

      if (agentConfig?.telegram_enabled && agentConfig?.telegram_chat_ids) {
        console.log('[Notify] Found agent config in DB')

        // Use agent filters from DB (or defaults)
        const agentFilters = {
          alertOnFail: agentConfig.alert_on_fail ?? true,
          alertOnSuccess: agentConfig.alert_on_success ?? false,
          alertIp: agentConfig.alert_ip ?? true,
          alertGps: agentConfig.alert_gps ?? true,
        }

        if (shouldSendAlert(status, detectedErrorType, agentFilters)) {
          const dbChatIds = agentConfig.telegram_chat_ids.split(',').map((id: string) => id.trim()).filter((id: string) => id)

          for (const chatId of dbChatIds) {
            const sent = await sendTelegramMessage(botToken, chatId, text)
            if (sent) sentToAgent++
          }
        } else {
          console.log('[Notify] Agent alert (from DB) filtered out')
        }
      }
    }

    // ============================================
    // FLOW 2: SEND TO ADMIN (based on license.alert_enabled)
    // ============================================
    // This only happens if the ADMIN enabled monitoring for this license

    // Use defaults for NULL values (for old licenses)
    const licenseAlertEnabled = license.alert_enabled ?? false
    const licenseAlertIp = license.alert_ip ?? true
    const licenseAlertGps = license.alert_gps ?? true
    const licenseAlertOnFail = license.alert_on_fail ?? true
    const licenseAlertOnSuccess = license.alert_on_success ?? false

    console.log('[Notify] License alert settings:', {
      enabled: licenseAlertEnabled,
      ip: licenseAlertIp,
      gps: licenseAlertGps,
      onFail: licenseAlertOnFail,
      onSuccess: licenseAlertOnSuccess
    })

    if (licenseAlertEnabled) {
      // Get admin (owner of the license)
      const ownerId = license.created_by || license.admin_id
      console.log('[Notify] License owner ID:', ownerId)

      if (ownerId) {
        const adminProfile = await getAdminProfile(ownerId)
        console.log('[Notify] Admin profile:', adminProfile)

        if (adminProfile?.telegram_enabled && adminProfile?.telegram_chat_id) {
          // License-level filters
          const licenseFilters = {
            alertOnFail: licenseAlertOnFail,
            alertOnSuccess: licenseAlertOnSuccess,
            alertIp: licenseAlertIp,
            alertGps: licenseAlertGps,
          }

          // Admin-level filters (if they exist, otherwise defaults)
          const adminFilters = {
            alertOnFail: adminProfile.admin_alert_on_fail ?? true,
            alertOnSuccess: adminProfile.admin_alert_on_success ?? true, // Admins get success by default
            alertIp: adminProfile.admin_alert_ip ?? true,
            alertGps: adminProfile.admin_alert_gps ?? true,
          }

          console.log('[Notify] License filters:', licenseFilters)
          console.log('[Notify] Admin filters:', adminFilters)

          // Must pass BOTH license filters AND admin filters
          const passesLicenseFilter = shouldSendAlert(status, detectedErrorType, licenseFilters)
          const passesAdminFilter = shouldSendAlert(status, detectedErrorType, adminFilters)

          console.log('[Notify] Passes license filter:', passesLicenseFilter)
          console.log('[Notify] Passes admin filter:', passesAdminFilter)

          if (passesLicenseFilter && passesAdminFilter) {
            const sent = await sendTelegramMessage(botToken, adminProfile.telegram_chat_id, text)
            if (sent) sentToAdmin++
          } else {
            console.log('[Notify] Admin alert filtered out')
          }
        } else {
          console.log('[Notify] Admin telegram not enabled or no chat_id')
        }
      }
    } else {
      console.log('[Notify] License alerts not enabled (skipping admin notification)')
    }

    const totalSent = sentToAgent + sentToAdmin
    console.log('[Notify] Total sent:', totalSent, '(agent:', sentToAgent, ', admin:', sentToAdmin, ')')

    return NextResponse.json({
      success: true,
      sent_to: totalSent,
      sent_to_agent: sentToAgent,
      sent_to_admin: sentToAdmin
    })

  } catch (error) {
    console.error('[Notify] Error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
