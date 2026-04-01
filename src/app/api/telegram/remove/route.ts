import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, hardware_id, chat_id } = body

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
        .select('telegram_chat_ids, telegram_chat_id')
        .eq('id', user_id)
        .single()

      if (profile) {
        const currentIds: string[] = profile.telegram_chat_ids || []
        const updatedIds = currentIds.filter(id => id !== chat_id)

        await supabase
          .from('profiles')
          .update({
            telegram_chat_ids: updatedIds,
            // If removing the legacy chat_id, clear it or set to first remaining
            telegram_chat_id: profile.telegram_chat_id === chat_id
              ? (updatedIds[0] || null)
              : profile.telegram_chat_id,
            // Disable telegram if no chat_ids left
            telegram_enabled: updatedIds.length > 0,
          })
          .eq('id', user_id)
      }
    }

    // Remove from configurations (App.py)
    if (hardware_id) {
      const { data: config } = await supabase
        .from('configurations')
        .select('telegram_chat_ids')
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
