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

async function getUserTelegramChatId(userId: string): Promise<{ chatId: string | null, enabled: boolean }> {
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('telegram_chat_id, telegram_enabled')
      .eq('id', userId)
      .single()
    return {
      chatId: data?.telegram_chat_id || null,
      enabled: data?.telegram_enabled || false
    }
  } catch {
    return { chatId: null, enabled: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { license_key, status, ip, location, message, chat_ids } = body

    console.log('[Notify] Received:', { license_key, status, ip, location, message, chat_ids })

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
    console.log('[Notify] alert_enabled:', license.alert_enabled)
    console.log('[Notify] alert_on_fail:', license.alert_on_fail)
    console.log('[Notify] alert_on_success:', license.alert_on_success)
    console.log('[Notify] created_by:', license.created_by)
    console.log('[Notify] admin_id:', license.admin_id)

    // Check if alerts enabled
    if (!license.alert_enabled) {
      console.log('[Notify] Alerts not enabled for this license')
      return NextResponse.json({ success: true, message: 'Alerts disabled' })
    }

    // Check if should alert based on status
    const isFailure = status === 'error'
    if (isFailure && !license.alert_on_fail) {
      console.log('[Notify] Failure alerts not enabled')
      return NextResponse.json({ success: true, message: 'Failure alerts disabled' })
    }
    if (!isFailure && !license.alert_on_success) {
      console.log('[Notify] Success alerts not enabled')
      return NextResponse.json({ success: true, message: 'Success alerts disabled' })
    }

    // Get bot token
    const botToken = await getTelegramToken()
    if (!botToken) {
      console.log('[Notify] No bot token configured')
      return NextResponse.json({ success: false, error: 'No bot token' }, { status: 500 })
    }

    // Build message
    const icon = isFailure ? '🔴' : '🟢'
    const title = isFailure ? 'CHECK FAILED' : 'CHECK PASSED'
    const msgLines = [
      `${icon} <b>${title}</b>`,
      '',
      `📋 License: <code>${license.license_key}</code>`,
      `👤 Agent: ${license.customer_name || 'Unknown'}`,
      `🌐 IP: ${ip || '--'}`,
      `📍 Location: ${location || '--'}`,
      '',
      `${isFailure ? '👎' : '👍'} ${message || (isFailure ? 'Check failed' : 'Ready to work!')}`,
      '',
      `🕐 ${new Date().toLocaleString('es-US', { timeZone: 'America/New_York' })}`,
    ]
    const text = msgLines.join('\n')

    // Collect all chat IDs
    const allChatIds: string[] = []

    // 1. ADMIN chat ID (from profile)
    const ownerId = license.created_by || license.admin_id
    console.log('[Notify] Owner ID:', ownerId)

    if (ownerId) {
      const { chatId, enabled } = await getUserTelegramChatId(ownerId)
      console.log('[Notify] Admin chatId:', chatId, 'enabled:', enabled)
      
      if (chatId && enabled) {
        allChatIds.push(chatId)
        console.log('[Notify] Added admin chat ID:', chatId)
      }
    }

    // 2. AGENT chat IDs (from request - optional)
    if (chat_ids && typeof chat_ids === 'string' && chat_ids.trim()) {
      const agentChatIds = chat_ids.split(',').map((id: string) => id.trim()).filter((id: string) => id)
      console.log('[Notify] Agent chat IDs:', agentChatIds)
      
      for (const id of agentChatIds) {
        if (!allChatIds.includes(id)) {
          allChatIds.push(id)
        }
      }
    }

    console.log('[Notify] All chat IDs to send:', allChatIds)

    if (allChatIds.length === 0) {
      console.log('[Notify] No chat IDs available')
      return NextResponse.json({ success: false, error: 'No chat IDs available' }, { status: 500 })
    }

    // Send to all chat IDs
    let sentCount = 0
    for (const chatId of allChatIds) {
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
          sentCount++
        } else {
          console.log('[Notify] Failed to send to:', chatId, result)
        }
      } catch (err) {
        console.error('[Notify] Error sending to:', chatId, err)
      }
    }

    return NextResponse.json({ success: true, sent_to: sentCount })

  } catch (error) {
    console.error('[Notify] Error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
