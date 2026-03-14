import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {}

  // Check environment variable
  results.env_token = process.env.TELEGRAM_BOT_TOKEN ? 'SET (length: ' + process.env.TELEGRAM_BOT_TOKEN.length + ')' : 'NOT SET'

  // Check database
  try {
    const { data, error } = await getSupabase()
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_bot_token')
      .single()

    results.db_token = data?.value ? 'SET (length: ' + data.value.length + ')' : 'NOT SET'
    results.db_error = error?.message || null
  } catch (err) {
    results.db_error = String(err)
  }

  // Check a sample license for alert settings
  const licenseKey = request.nextUrl.searchParams.get('license')
  if (licenseKey) {
    const { data: license } = await getSupabase()
      .from('licenses')
      .select('license_key, customer_name, alert_enabled, alert_on_fail, alert_on_success, created_by, admin_id')
      .eq('license_key', licenseKey)
      .single()

    results.license = license || 'NOT FOUND'

    // Check owner's telegram settings
    if (license?.created_by || license?.admin_id) {
      const ownerId = license.created_by || license.admin_id
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('username, telegram_chat_id, telegram_enabled')
        .eq('id', ownerId)
        .single()

      results.owner_profile = profile || 'NOT FOUND'
    }
  }

  // Test send if chat_id provided
  const testChatId = request.nextUrl.searchParams.get('chat_id')
  if (testChatId) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (botToken) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: testChatId,
            text: '🧪 <b>Test Message</b>\n\nYour Telegram alerts are working!',
            parse_mode: 'HTML',
          }),
        })
        const result = await response.json()
        results.test_send = result
      } catch (err) {
        results.test_send_error = String(err)
      }
    } else {
      results.test_send = 'No bot token available'
    }
  }

  return NextResponse.json(results, { status: 200 })
}
