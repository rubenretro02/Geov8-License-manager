import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  const licenseKey = request.nextUrl.searchParams.get('license')

  if (!licenseKey) {
    return NextResponse.json({ error: 'Provide ?license=YOUR_LICENSE_KEY' })
  }

  const debug: Record<string, unknown> = {}

  // Step 1: Check bot token
  debug.step1_bot_token = process.env.TELEGRAM_BOT_TOKEN
    ? `SET (${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...)`
    : 'NOT SET'

  // Step 2: Get license
  const { data: license, error: licenseError } = await getSupabase()
    .from('licenses')
    .select('license_key, customer_name, alert_enabled, alert_on_fail, alert_on_success, created_by, admin_id')
    .eq('license_key', licenseKey)
    .single()

  if (licenseError || !license) {
    debug.step2_license = 'NOT FOUND'
    return NextResponse.json(debug)
  }

  debug.step2_license = {
    license_key: license.license_key,
    customer_name: license.customer_name,
    alert_enabled: license.alert_enabled,
    alert_on_fail: license.alert_on_fail,
    alert_on_success: license.alert_on_success,
    created_by: license.created_by,
    admin_id: license.admin_id,
  }

  // Step 3: Check if alerts would be sent
  debug.step3_would_send_on_fail = license.alert_enabled && license.alert_on_fail
  debug.step3_would_send_on_success = license.alert_enabled && license.alert_on_success

  // Step 4: Get owner's telegram settings
  const ownerId = license.created_by || license.admin_id
  debug.step4_owner_id = ownerId

  if (ownerId) {
    const { data: profile, error: profileError } = await getSupabase()
      .from('profiles')
      .select('id, username, telegram_chat_id, telegram_enabled')
      .eq('id', ownerId)
      .single()

    if (profileError || !profile) {
      debug.step5_owner_profile = 'NOT FOUND'
    } else {
      debug.step5_owner_profile = {
        id: profile.id,
        username: profile.username,
        telegram_chat_id: profile.telegram_chat_id,
        telegram_enabled: profile.telegram_enabled,
      }

      // Step 6: Would we actually send?
      debug.step6_final_check = {
        has_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
        license_alert_enabled: license.alert_enabled,
        license_alert_on_fail: license.alert_on_fail,
        owner_has_chat_id: !!profile.telegram_chat_id,
        owner_telegram_enabled: profile.telegram_enabled,
        WOULD_SEND_ON_FAILURE: !!(
          process.env.TELEGRAM_BOT_TOKEN &&
          license.alert_enabled &&
          license.alert_on_fail &&
          profile.telegram_chat_id &&
          profile.telegram_enabled
        )
      }

      // Step 7: Test send if all conditions are met
      if (debug.step6_final_check.WOULD_SEND_ON_FAILURE && profile.telegram_chat_id) {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: profile.telegram_chat_id,
                text: `🧪 <b>DEBUG TEST</b>\n\n✅ Alert system working for license:\n<code>${licenseKey}</code>\n\nIf you see this, alerts should work!`,
                parse_mode: 'HTML',
              }),
            }
          )
          const result = await response.json()
          debug.step7_test_send = result
        } catch (err) {
          debug.step7_test_send_error = String(err)
        }
      }
    }
  }

  return NextResponse.json(debug, { status: 200 })
}
