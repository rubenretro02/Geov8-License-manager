import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

interface NotifyRequest {
  license_key: string
  status?: string
  ip?: string
  location?: string
  message?: string
  chat_ids?: string
}

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

async function getUserTelegramChatId(userId: string) {
  try {
    const { data } = await getSupabase().from('profiles').select('telegram_chat_id, telegram_enabled').eq('id', userId).single()
    return { chatId: data?.telegram_chat_id || null, enabled: data?.telegram_enabled || false }
  } catch { return { chatId: null, enabled: false } }
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { license_key, status, ip, location, message, chat_ids }: NotifyRequest = await request.json()
    if (!license_key) return NextResponse.json({ success: false, error: 'Missing license_key' }, { status: 400 })

    const { data: license } = await getSupabase().from('licenses').select('*').eq('license_key', license_key).single()
    if (!license) return NextResponse.json({ success: false, error: 'License not found' }, { status: 404 })
    if (!license.alert_enabled) return NextResponse.json({ success: true, message: 'Alerts disabled' })

    const isError = status === 'error'
    if (isError && !license.alert_on_fail) return NextResponse.json({ success: true })
    if (!isError && !license.alert_on_success) return NextResponse.json({ success: true })

    const botToken = await getTelegramToken()
    if (!botToken) return NextResponse.json({ success: false, error: 'No bot token' }, { status: 500 })

    const icon = isError ? '🔴' : '🟢'
    const title = isError ? 'CHECK FAILED' : 'CHECK PASSED'
    const text = `${icon} <b>${title}</b>\n\n📋 License: <code>${license.license_key}</code>\n👤 Agent: ${license.customer_name || 'Unknown'}\n🌐 IP: ${ip || '--'}\n📍 Location: ${location || '--'}\n\n${isError ? '👎' : '👍'} ${message}\n\n🕐 ${new Date().toLocaleString('es-US', { timeZone: 'America/New_York' })}`

    // If chat_ids is provided, send to those chat IDs directly
    if (chat_ids && chat_ids.trim()) {
      const chatIdList = chat_ids.split(',').map(id => id.trim()).filter(id => id)
      for (const chatId of chatIdList) {
        await sendTelegramMessage(botToken, chatId, text)
      }
      return NextResponse.json({ success: true, sent_to: chatIdList.length })
    }

    // Otherwise, use the existing logic (get from user profile)
    const ownerId = license.created_by || license.admin_id
    const { chatId, enabled } = await getUserTelegramChatId(ownerId)
    if (!chatId || !enabled) return NextResponse.json({ success: false, error: 'Telegram not configured' }, { status: 500 })

    await sendTelegramMessage(botToken, chatId, text)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
