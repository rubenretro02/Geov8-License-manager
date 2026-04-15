import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Supabase client with service role for full access
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Telegram Bot Token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8540683624:AAHEbhdlr8duJpoAfIlgwWSQwx_7U0MI0EE'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      first_name?: string
      username?: string
      type: string
    }
    date: number
    text?: string
  }
}

async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    })
    const result = await response.json()
    return result.ok
  } catch (err) {
    console.error('[Webhook] Error sending message:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()

    console.log('[Webhook] Received update:', JSON.stringify(update, null, 2))

    // Only process text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id
    const text = update.message.text
    const username = update.message.from.username || ''
    const firstName = update.message.from.first_name || ''

    // Check if it's a /start command with a code
    if (text.startsWith('/start')) {
      const parts = text.split(' ')

      if (parts.length === 1) {
        // Just /start without code - send welcome message
        await sendTelegramMessage(chatId,
          `👋 <b>Welcome to GeoAlerts Bot!</b>\n\n` +
          `To connect your account:\n` +
          `1. Go to your License Manager profile\n` +
          `2. Click "Connect Telegram"\n` +
          `3. Scan the QR code or click the link\n\n` +
          `Your Chat ID: <code>${chatId}</code>`
        )
        return NextResponse.json({ ok: true })
      }

      // /start LINK_xxxxx - linking code
      const code = parts[1]
      console.log('[Webhook] Processing link code:', code)

      const supabase = getSupabase()

      // Find the link code
      const { data: linkData, error: linkError } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (linkError || !linkData) {
        console.log('[Webhook] Link code not found or expired:', code)
        await sendTelegramMessage(chatId,
          `❌ <b>Link code not found or expired</b>\n\n` +
          `Please generate a new code from the app.`
        )
        return NextResponse.json({ ok: true })
      }

      // Mark as used and save chat_id
      const { error: updateError } = await supabase
        .from('telegram_links')
        .update({
          used: true,
          chat_id: String(chatId),
          telegram_username: username,
          telegram_first_name: firstName,
        })
        .eq('id', linkData.id)

      if (updateError) {
        console.error('[Webhook] Error updating link:', updateError)
        await sendTelegramMessage(chatId, `❌ Error linking account. Please try again.`)
        return NextResponse.json({ ok: true })
      }

      // If it's for a user (web app), update their profile
      if (linkData.user_id) {
        // Get current telegram_chat_ids
        const { data: profile } = await supabase
          .from('profiles')
          .select('telegram_chat_ids')
          .eq('id', linkData.user_id)
          .single()

        const currentIds: string[] = profile?.telegram_chat_ids || []
        const chatIdStr = String(chatId)

        // Add if not already present
        if (!currentIds.includes(chatIdStr)) {
          currentIds.push(chatIdStr)

          await supabase
            .from('profiles')
            .update({
              telegram_chat_ids: currentIds,
              telegram_chat_id: chatIdStr, // Keep legacy field updated
              telegram_enabled: true,
            })
            .eq('id', linkData.user_id)
        }
      }

      // If it's for a hardware_id (App.py), update configurations
      if (linkData.hardware_id) {
        const { data: config } = await supabase
          .from('configurations')
          .select('telegram_chat_ids')
          .eq('hardware_id', linkData.hardware_id)
          .single()

        const chatIdStr = String(chatId)

        if (config) {
          // Update existing configuration
          const currentIds = config.telegram_chat_ids
            ? config.telegram_chat_ids.split(',').map((id: string) => id.trim())
            : []

          if (!currentIds.includes(chatIdStr)) {
            currentIds.push(chatIdStr)

            await supabase
              .from('configurations')
              .update({
                telegram_chat_ids: currentIds.join(','),
                telegram_enabled: true,
              })
              .eq('hardware_id', linkData.hardware_id)
          }
        } else {
          // Create new configuration if it doesn't exist
          await supabase
            .from('configurations')
            .insert({
              hardware_id: linkData.hardware_id,
              telegram_chat_ids: chatIdStr,
              telegram_enabled: true,
            })
        }
      }

      // Send success message
      await sendTelegramMessage(chatId,
        `✅ <b>Successfully connected!</b>\n\n` +
        `You will now receive alerts here.\n\n` +
        `Chat ID: <code>${chatId}</code>\n` +
        (username ? `Username: @${username}` : '')
      )

      return NextResponse.json({ ok: true })
    }

    // Unknown command - send help
    await sendTelegramMessage(chatId,
      `🤖 <b>GeoAlerts Bot</b>\n\n` +
      `Commands:\n` +
      `/start - Connect your account\n\n` +
      `Your Chat ID: <code>${chatId}</code>`
    )

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook is active' })
}
