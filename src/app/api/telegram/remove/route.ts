import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface DisconnectInfo {
  chatId: string
  disconnectedBy?: string  // Username of who disconnected
  source?: 'web' | 'app'   // Where the disconnect happened
  licenseKey?: string      // License key if from app
  licenseName?: string     // License name if from app
  hardwareId?: string      // Hardware ID if from app
  ip?: string              // IP address
  country?: string         // Country
}

async function sendDisconnectNotification(info: DisconnectInfo) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return

  try {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })

    let message = `🔌 <b>Disconnected</b>\n\n`
    message += `Your Telegram has been disconnected from GeoAlerts.\n\n`

    message += `<b>Details:</b>\n`
    message += `━━━━━━━━━━━━━━━━━━━━━\n`

    if (info.disconnectedBy) {
      message += `👤 <b>Disconnected by:</b> ${info.disconnectedBy}\n`
    }

    if (info.source) {
      message += `📱 <b>Source:</b> ${info.source === 'web' ? 'Web Panel' : 'Desktop App'}\n`
    }

    if (info.licenseKey) {
      message += `🔑 <b>License:</b> <code>${info.licenseKey}</code>\n`
    }

    if (info.licenseName) {
      message += `📝 <b>Name:</b> ${info.licenseName}\n`
    }

    if (info.hardwareId) {
      message += `💻 <b>HWID:</b> <code>${info.hardwareId.substring(0, 16)}...</code>\n`
    }

    if (info.ip) {
      message += `🌐 <b>IP:</b> ${info.ip}\n`
    }

    if (info.country) {
      message += `📍 <b>Country:</b> ${info.country}\n`
    }

    message += `🕐 <b>Time:</b> ${timestamp} UTC\n`
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `⚠️ You will no longer receive notifications on this account.`

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: info.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (error) {
    console.error('[Remove] Error sending disconnect notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      hardware_id,
      chat_id,
      // Additional info for better notifications
      disconnected_by,
      license_key,
      license_name,
      ip,
      country
    } = body

    if (!chat_id) {
      return NextResponse.json(
        { success: false, error: 'Missing chat_id' },
        { status: 400 }
      )
    }

    if (!user_id && !hardware_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or hardware_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Remove from profiles (web app)
    if (user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_ids, telegram_chat_id, username, role')
        .eq('id', user_id)
        .single()

      if (profile) {
        const currentIds: string[] = profile.telegram_chat_ids || []
        const updatedIds = currentIds.filter(id => id !== chat_id)

        await supabase
          .from('profiles')
          .update({
            telegram_chat_ids: updatedIds,
            telegram_chat_id: profile.telegram_chat_id === chat_id
              ? (updatedIds[0] || null)
              : profile.telegram_chat_id,
            telegram_enabled: updatedIds.length > 0,
          })
          .eq('id', user_id)

        // Send disconnect notification with details
        await sendDisconnectNotification({
          chatId: chat_id,
          disconnectedBy: profile.username || 'Unknown',
          source: 'web',
        })
      }
    }

    // Remove from configurations (App.py)
    if (hardware_id) {
      const { data: config } = await supabase
        .from('configurations')
        .select('telegram_chat_ids, license_key')
        .eq('hardware_id', hardware_id)
        .single()

      if (config && config.telegram_chat_ids) {
        const currentIds = config.telegram_chat_ids
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id !== chat_id)

        await supabase
          .from('configurations')
          .update({
            telegram_chat_ids: currentIds.join(','),
            telegram_enabled: currentIds.length > 0,
          })
          .eq('hardware_id', hardware_id)

        // Get license info if available
        let licenseInfo: { name?: string; key?: string } = {}
        if (config.license_key) {
          const { data: license } = await supabase
            .from('licenses')
            .select('name, key')
            .eq('key', config.license_key)
            .single()

          if (license) {
            licenseInfo = { name: license.name, key: license.key }
          }
        }

        // Send disconnect notification with all details
        await sendDisconnectNotification({
          chatId: chat_id,
          disconnectedBy: disconnected_by || 'Agent',
          source: 'app',
          licenseKey: license_key || licenseInfo.key || config.license_key,
          licenseName: license_name || licenseInfo.name,
          hardwareId: hardware_id,
          ip: ip,
          country: country,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chat ID removed',
    })

  } catch (error) {
    console.error('[Remove] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
