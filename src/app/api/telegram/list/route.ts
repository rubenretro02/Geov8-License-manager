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
    const userId = searchParams.get('user_id')
    const hardwareId = searchParams.get('hardware_id')

    if (!userId && !hardwareId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or hardware_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    const connectedTelegrams: Array<{
      chat_id: string
      username?: string
      first_name?: string
    }> = []

    // Get from profiles (web app)
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_ids')
        .eq('id', userId)
        .single()

      if (profile?.telegram_chat_ids) {
        // Get additional info from telegram_links if available
        for (const chatId of profile.telegram_chat_ids) {
          const { data: linkInfo } = await supabase
            .from('telegram_links')
            .select('telegram_username, telegram_first_name')
            .eq('chat_id', chatId)
            .eq('used', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          connectedTelegrams.push({
            chat_id: chatId,
            username: linkInfo?.telegram_username || undefined,
            first_name: linkInfo?.telegram_first_name || undefined,
          })
        }
      }
    }

    // Get from configurations (App.py)
    if (hardwareId) {
      const { data: config } = await supabase
        .from('configurations')
        .select('telegram_chat_ids')
        .eq('hardware_id', hardwareId)
        .single()

      if (config?.telegram_chat_ids) {
        const chatIds = config.telegram_chat_ids
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id)

        for (const chatId of chatIds) {
          // Avoid duplicates
          if (!connectedTelegrams.find(t => t.chat_id === chatId)) {
            const { data: linkInfo } = await supabase
              .from('telegram_links')
              .select('telegram_username, telegram_first_name')
              .eq('chat_id', chatId)
              .eq('used', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            connectedTelegrams.push({
              chat_id: chatId,
              username: linkInfo?.telegram_username || undefined,
              first_name: linkInfo?.telegram_first_name || undefined,
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      telegrams: connectedTelegrams,
      count: connectedTelegrams.length,
    })

  } catch (error) {
    console.error('[List] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
