import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Generate a random code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'LINK_'
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, hardware_id } = body

    // Must have either user_id or hardware_id
    if (!user_id && !hardware_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or hardware_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Generate unique code
    let code = generateCode()
    let attempts = 0

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('telegram_links')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break

      code = generateCode()
      attempts++
    }

    // Create expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Insert link record
    const { data, error } = await supabase
      .from('telegram_links')
      .insert({
        code,
        user_id: user_id || null,
        hardware_id: hardware_id || null,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) {
      console.error('[GenerateCode] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to generate code' },
        { status: 500 }
      )
    }

    // Build the Telegram link
    const botUsername = 'geoalerts_bot' // Your bot username
    const telegramLink = `https://t.me/${botUsername}?start=${code}`

    return NextResponse.json({
      success: true,
      code,
      link: telegramLink,
      expires_at: expiresAt,
      link_id: data.id,
    })

  } catch (error) {
    console.error('[GenerateCode] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
