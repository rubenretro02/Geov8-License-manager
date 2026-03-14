'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  full_name?: string
  username?: string
}

export async function updateProfile(data: UpdateProfileData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  // Validate username if provided
  if (data.username) {
    if (data.username.length < 3) {
      return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' }
    }

    // Check if username is taken by another user
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', data.username.toLowerCase())
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return { success: false, error: 'Este nombre de usuario ya está en uso' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      username: data.username?.toLowerCase(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}

export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error('Error changing password:', error)
    if (error.message.includes('same as')) {
      return { success: false, error: 'La nueva contraseña debe ser diferente a la actual' }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

interface TelegramSettings {
  telegram_chat_id: string
  telegram_enabled: boolean
}

export async function updateTelegramSettings(data: TelegramSettings): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      telegram_chat_id: data.telegram_chat_id || null,
      telegram_enabled: data.telegram_enabled,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating telegram settings:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/profile')
  return { success: true }
}

export async function sendTestTelegramMessage(chatId: string): Promise<{ success: boolean; error?: string }> {
  // Get bot token from env or database
  let botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    // Try database
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_bot_token')
      .single()
    botToken = data?.value
  }

  if (!botToken) {
    return { success: false, error: 'No Telegram bot token configured. Contact admin.' }
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🧪 <b>Test Message</b>\n\n✅ Your Telegram alerts are working!\n\nYou will receive notifications when license checks fail.',
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()

    if (!result.ok) {
      return { success: false, error: result.description || 'Failed to send message' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending test message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}
