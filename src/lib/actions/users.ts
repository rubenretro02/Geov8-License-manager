'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile, CreateUserFormData } from '@/lib/types'
import { getCurrentProfile } from './licenses'

export async function getTeamMembers(): Promise<Profile[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile.role === 'super_admin') {
    // Super admin sees all users
  } else if (profile.role === 'admin') {
    // Admin sees themselves and their users
    query = query.or(`id.eq.${profile.id},admin_id.eq.${profile.id}`)
  } else {
    // User only sees their team (same admin_id)
    if (profile.admin_id) {
      query = query.or(`id.eq.${profile.admin_id},admin_id.eq.${profile.admin_id}`)
    } else {
      query = query.eq('id', profile.id)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return data || []
}

export async function createUser(formData: CreateUserFormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check permissions
  if (currentProfile.role === 'user') {
    return { success: false, error: 'Users cannot create other users' }
  }

  if (currentProfile.role === 'admin' && formData.role === 'admin') {
    return { success: false, error: 'Admins can only create users, not other admins' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(formData.email)) {
    return { success: false, error: 'Por favor ingresa un email válido (ejemplo: usuario@dominio.com)' }
  }

  // Validate password length
  if (formData.password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  // Validate username
  if (formData.username.length < 3) {
    return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' }
  }

  // Check that service role key is configured
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    console.error('Missing Supabase configuration:', {
      hasServiceKey: !!serviceRoleKey,
      hasUrl: !!supabaseUrl
    })
    return { success: false, error: 'Server configuration error. Contact administrator.' }
  }

  // Use service role to create user without affecting current session
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceSupabase = createServiceClient(supabaseUrl, serviceRoleKey)

  // Create auth user using admin API
  const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      username: formData.username,
      full_name: formData.full_name,
    }
  })

  if (authError) {
    console.error('Error creating auth user:', {
      message: authError.message,
      status: authError.status,
      code: authError.code,
    })
    // Provide more helpful error messages in Spanish
    if (authError.message.includes('Invalid API key')) {
      return { success: false, error: 'Error de configuración del servidor. Contacta al administrador.' }
    }
    if (authError.message.includes('already registered') || authError.code === 'email_exists') {
      return { success: false, error: 'Este email ya está registrado.' }
    }
    if (authError.message.includes('password')) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
    }
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: 'Error creating user' }
  }

  // Determine admin_id
  const adminId = formData.role === 'admin'
    ? authData.user.id  // Admin's admin_id is their own id
    : currentProfile.role === 'admin'
      ? currentProfile.id  // User belongs to current admin
      : currentProfile.admin_id  // User belongs to same admin as current user

  // Create profile using service role (use upsert to handle edge cases)
  const { error: profileError } = await serviceSupabase.from('profiles').upsert({
    id: authData.user.id,
    username: formData.username.toLowerCase(),
    email: formData.email.toLowerCase(),
    full_name: formData.full_name,
    role: formData.role,
    admin_id: adminId,
    // Set default credits and trial limits for new admins
    credits: formData.role === 'admin' ? 0 : 0,
    trial_limit: formData.role === 'admin' ? 20 : 0,
    trials_used_this_month: 0,
  }, {
    onConflict: 'id'
  })

  if (profileError) {
    console.error('Error creating profile:', profileError)
    // Handle common profile errors
    if (profileError.code === '23505') {
      // Duplicate key on username
      if (profileError.message.includes('username')) {
        return { success: false, error: 'Este nombre de usuario ya está en uso.' }
      }
      if (profileError.message.includes('email')) {
        return { success: false, error: 'Este email ya está en uso.' }
      }
      return { success: false, error: 'Este usuario ya existe en el sistema.' }
    }
    return { success: false, error: profileError.message }
  }

  revalidatePath('/team')
  return { success: true }
}

export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'user'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return { success: false, error: 'Only super admin can change roles' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/team')
  return { success: true }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get target user
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  // Check permissions
  if (currentProfile.role === 'user') {
    return { success: false, error: 'Unauthorized' }
  }

  if (currentProfile.role === 'admin') {
    // Admin can only delete their own users
    if (targetUser.admin_id !== currentProfile.id) {
      return { success: false, error: 'Solo puedes eliminar usuarios de tu equipo' }
    }
  }

  // Delete profile (auth user will remain but won't be able to access)
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/team')
  return { success: true }
}

export async function getTeamStats() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return { total: 0, admins: 0, users: 0 }

  let query = supabase.from('profiles').select('*')

  if (profile.role === 'admin') {
    query = query.or(`id.eq.${profile.id},admin_id.eq.${profile.id}`)
  } else if (profile.role === 'user') {
    return { total: 0, admins: 0, users: 0 }
  }

  const { data: members } = await query

  if (!members) return { total: 0, admins: 0, users: 0 }

  return {
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    users: members.filter(m => m.role === 'user').length,
  }
}
