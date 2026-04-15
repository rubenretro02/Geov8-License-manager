import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const linkId = searchParams.get('link_id')

    if (!code && !linkId) {
      return NextResponse.json(
        { success: false, error: 'Missing code or link_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    let query = supabase
      .from('telegram_links')
      .select('*')

    if (linkId) {
      query = query.eq('id', linkId)
    } else if (code) {
      query = query.eq('code', code)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: 'Link not found',
        status: 'not_found',
      })
    }

    // Check if expired
    const isExpired = new Date(data.expires_at) < new Date()

    if (isExpired && !data.used) {
      return NextResponse.json({
        success: true,
        status: 'expired',
        used: false,
      })
    }

    if (data.used) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        used: true,
        chat_id: data.chat_id,
        telegram_username: data.telegram_username,
        telegram_first_name: data.telegram_first_name,
      })
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      used: false,
      expires_at: data.expires_at,
    })

  } catch (error) {
    console.error('[Status] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
