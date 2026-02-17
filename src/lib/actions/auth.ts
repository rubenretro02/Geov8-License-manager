'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(identifier: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  let email = identifier.trim().toLowerCase()

  // Check if identifier is not an email (no @), then it's a username
  if (!identifier.includes('@')) {
    // Look up email by username in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier.toLowerCase())
      .single()

    if (profileError || !profile?.email) {
      return { error: 'User not found' }
    }

    email = profile.email
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Translate common errors to Spanish
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Credenciales inválidas' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Email no confirmado' }
    }
    return { error: error.message }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}
