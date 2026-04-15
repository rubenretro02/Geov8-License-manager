import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create Supabase client lazily at request time (not at build time)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface CheckRequest {
  license_key: string
  hwid: string
}

interface GeoInfo {
  country?: string
  state?: string
  city?: string
}

interface License {
  id: string
  license_key: string
  customer_name: string | null
  hwid: string | null
  is_active: boolean
  expires_at: string | null
  is_trial: boolean
  alert_enabled: boolean
  alert_ip: boolean
  alert_gps: boolean
  alert_on_fail: boolean
  alert_on_success: boolean
  created_by: string | null
  admin_id: string | null
}

// Get Telegram bot token - first from env, then from Supabase
async function getTelegramToken(): Promise<string | null> {
  // Try environment variable first
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN
  }

  // Fallback to database
  try {
    const { data } = await getSupabase()
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_bot_token')
      .single()
    return data?.value || null
  } catch {
    return null
  }
}

// Get user's Telegram chat ID
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

// Send Telegram notification
async function sendTelegramAlert(
  license: License,
  status: string,
  message: string,
  ip: string,
  geo: GeoInfo
) {
  console.log(`[Telegram] Attempting alert for license ${license.license_key}, status: ${status}`)
  console.log(`[Telegram] License alert_enabled: ${license.alert_enabled}, alert_on_fail: ${license.alert_on_fail}, alert_on_success: ${license.alert_on_success}`)

  // Only send if license has alerts enabled
  if (!license.alert_enabled) {
    console.log('[Telegram] Alerts not enabled for this license')
    return
  }

  // Check if should alert based on status (any non-valid status is a fail)
  const isFailure = status !== 'valid'
  if (isFailure && !license.alert_on_fail) {
    console.log('[Telegram] Failure alerts not enabled')
    return
  }
  if (!isFailure && !license.alert_on_success) {
    console.log('[Telegram] Success alerts not enabled')
    return
  }

  // Get bot token
  const botToken = await getTelegramToken()
  if (!botToken) {
    console.log('[Telegram] No bot token configured')
    return
  }
  console.log('[Telegram] Bot token found')

  // Get the owner's chat ID (created_by or admin_id)
  const ownerId = license.created_by || license.admin_id
  if (!ownerId) {
    console.log('[Telegram] No owner ID found for license')
    return
  }
  console.log(`[Telegram] Owner ID: ${ownerId}`)

  const { chatId, enabled } = await getUserTelegramChatId(ownerId)
  console.log(`[Telegram] User chatId: ${chatId}, enabled: ${enabled}`)

  if (!chatId || !enabled) {
    console.log('[Telegram] User has no Telegram chat ID or notifications disabled')
    return
  }

  // Build message
  const icon = isFailure ? '🔴' : '🟢'
  const title = isFailure ? 'CHECK FAILED' : 'CHECK PASSED'
  const detailIcon = isFailure ? '❌' : '✅'

  const msgLines = [
    `${icon} <b>${title}</b>`,
    '',
    `📋 License: <code>${license.license_key}</code>`,
    `👤 Agent: ${license.customer_name || 'Unknown'}`,
    `🌐 IP: ${ip}`,
    `📍 Location: ${geo.city || '--'}, ${geo.state || '--'}, ${geo.country || '--'}`,
    '',
    `${detailIcon} ${message}`,
    '',
    `🕐 ${new Date().toLocaleString()}`,
  ]

  const text = msgLines.join('\n')

  // Send to Telegram
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
      console.log(`[Telegram] Alert sent successfully to ${chatId}`)
    } else {
      console.error(`[Telegram] Failed to send:`, result)
    }
  } catch (err) {
    console.error('[Telegram] Error sending alert:', err)
  }
}

async function getGeoFromIP(ip: string): Promise<GeoInfo> {
  try {
    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`)
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country,
        state: data.regionName,
        city: data.city,
      }
    }
  } catch (error) {
    console.error('Error getting geo info:', error)
  }
  return {}
}

async function createCheckLog(
  licenseKey: string | null,
  hwid: string,
  ipAddress: string,
  status: string,
  message: string,
  geo: GeoInfo
) {
  try {
    await getSupabase().from('check_logs').insert({
      license_key: licenseKey,
      hwid: hwid,
      ip_address: ipAddress,
      ip_country: geo.country || null,
      ip_state: geo.state || null,
      ip_city: geo.city || null,
      status: status,
      message: message,
    })
  } catch (error) {
    console.error('Error creating check log:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequest = await request.json()
    const { license_key, hwid } = body

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    // Get geo info
    const geo = await getGeoFromIP(ip)

    // Validate required fields
    if (!license_key || !hwid) {
      await createCheckLog(license_key || null, hwid || 'unknown', ip, 'error', 'Missing license_key or hwid', geo)
      return NextResponse.json(
        { valid: false, error: 'Missing license_key or hwid' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Find the license (include alert settings)
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single()

    if (licenseError || !license) {
      await createCheckLog(license_key, hwid, ip, 'invalid', 'License not found', geo)
      return NextResponse.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }

    // Cast to License type
    const lic = license as License

    // Check if license is active
    if (!lic.is_active) {
      await createCheckLog(license_key, hwid, ip, 'invalid', 'License is deactivated', geo)
      await sendTelegramAlert(lic, 'error', 'License is deactivated', ip, geo)
      return NextResponse.json(
        { valid: false, error: 'License is deactivated' },
        { status: 403 }
      )
    }

    // Check if license is expired
    if (lic.expires_at) {
      const expiresAt = new Date(lic.expires_at)
      if (expiresAt < new Date()) {
        await createCheckLog(license_key, hwid, ip, 'expired', 'License has expired', geo)
        await sendTelegramAlert(lic, 'error', 'License has expired', ip, geo)
        return NextResponse.json(
          { valid: false, error: 'License has expired', expires_at: lic.expires_at },
          { status: 403 }
        )
      }
    }

    // Check HWID binding - STRICT: One license = One PC
    const hasExistingHwid = lic.hwid && lic.hwid.trim().length > 0

    if (hasExistingHwid) {
      if (lic.hwid !== hwid) {
        await createCheckLog(license_key, hwid, ip, 'invalid', `HWID mismatch. License bound to: ${lic.hwid!.substring(0, 8)}...`, geo)
        await sendTelegramAlert(lic, 'error', `HWID mismatch - different device trying to use license`, ip, geo)
        return NextResponse.json(
          { valid: false, error: 'License is already activated on another device. Contact support to reset.' },
          { status: 403 }
        )
      }
    }

    if (!hasExistingHwid) {
      const { error: updateError } = await supabase
        .from('licenses')
        .update({
          hwid: hwid,
          activated_at: new Date().toISOString(),
          current_activations: 1,
        })
        .eq('license_key', license_key)

      if (updateError) {
        console.error('Failed to bind HWID:', updateError)
        await createCheckLog(license_key, hwid, ip, 'error', `Failed to bind HWID: ${updateError.message}`, geo)
        return NextResponse.json(
          { valid: false, error: 'Failed to activate license. Please try again.' },
          { status: 500 }
        )
      }

      const { data: verifyLicense, error: verifyError } = await supabase
        .from('licenses')
        .select('hwid')
        .eq('license_key', license_key)
        .single()

      if (verifyError || !verifyLicense?.hwid || verifyLicense.hwid !== hwid) {
        console.error('HWID verification failed:', { verifyError, savedHwid: verifyLicense?.hwid, expectedHwid: hwid })
        await createCheckLog(license_key, hwid, ip, 'error', 'HWID binding verification failed', geo)
        return NextResponse.json(
          { valid: false, error: 'License activation failed. Please contact support.' },
          { status: 500 }
        )
      }

      console.log(`License ${license_key} successfully bound to HWID: ${hwid.substring(0, 8)}...`)
    }

    // Success - create log and optionally send success alert
    await createCheckLog(license_key, hwid, ip, 'valid', 'License is valid', geo)

    // Send success alert if enabled
    if (lic.alert_on_success) {
      await sendTelegramAlert(lic, 'valid', 'License check passed', ip, geo)
    }

    return NextResponse.json({
      valid: true,
      customer_name: lic.customer_name,
      expires_at: lic.expires_at,
      is_trial: lic.is_trial,
      message: 'License is valid',
    })

  } catch (error) {
    console.error('Check API error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for simple checks
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const license_key = searchParams.get('license_key')
  const hwid = searchParams.get('hwid')

  if (!license_key || !hwid) {
    return NextResponse.json(
      { valid: false, error: 'Missing license_key or hwid query parameters' },
      { status: 400 }
    )
  }

  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ license_key, hwid }),
  })

  return POST(mockRequest)
}
