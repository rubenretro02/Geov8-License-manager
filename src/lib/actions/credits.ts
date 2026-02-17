'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentProfile } from './licenses'
import type { CreditTransaction, Profile } from '@/lib/types'

// Check and reset trials if needed (monthly reset)
export async function checkAndResetTrials(profile: Profile): Promise<Profile> {
  const supabase = await createClient()
  const now = new Date()

  // If no reset date or reset date has passed, reset trials
  if (!profile.trial_reset_date || new Date(profile.trial_reset_date) <= now) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1) // First of next month

    const { data } = await supabase
      .from('profiles')
      .update({
        trials_used_this_month: 0,
        trial_reset_date: nextReset.toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (data) return data
  }

  return profile
}

// Get profile with credit info
export async function getProfileWithCredits(userId: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!data) return null

  // Check and reset trials if needed
  return await checkAndResetTrials(data)
}

// Add credits to a reseller (super_admin only)
export async function addCredits(
  profileId: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return { success: false, error: 'Only super admin can add credits' }
  }

  // Get current profile
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', profileId)
    .single()

  if (!targetProfile) {
    return { success: false, error: 'User not found' }
  }

  const newBalance = (targetProfile.credits || 0) + amount

  // Update credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', profileId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    profile_id: profileId,
    amount: amount,
    type: amount > 0 ? 'purchase' : 'adjustment',
    description: description || `Credits ${amount > 0 ? 'added' : 'removed'} by admin`,
    created_by: currentProfile.id,
  })

  revalidatePath('/team')
  revalidatePath('/credits')
  return { success: true }
}

// Set trial limit for a reseller (super_admin only)
export async function setTrialLimit(
  profileId: string,
  limit: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return { success: false, error: 'Only super admin can configure limits' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ trial_limit: limit })
    .eq('id', profileId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/team')
  return { success: true }
}

// Deduct credits for license creation
export async function deductCreditsForLicense(
  isPermanent: boolean,
  isTrial: boolean
): Promise<{ success: boolean; error?: string; creditsDeducted?: number }> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { success: false, error: 'Unauthorized' }
  }

  // Super admin doesn't need credits
  if (profile.role === 'super_admin') {
    return { success: true, creditsDeducted: 0 }
  }

  // Check and reset trials if needed
  const updatedProfile = await checkAndResetTrials(profile)

  // Handle trial licenses
  if (isTrial) {
    if (updatedProfile.trials_used_this_month >= updatedProfile.trial_limit) {
      return {
        success: false,
        error: `Trial limit reached (${updatedProfile.trial_limit}/month). Contact administrator.`
      }
    }

    // Increment trials used
    await supabase
      .from('profiles')
      .update({ trials_used_this_month: updatedProfile.trials_used_this_month + 1 })
      .eq('id', profile.id)

    return { success: true, creditsDeducted: 0 }
  }

  // Calculate credits needed
  const creditsNeeded = isPermanent ? 10 : 1

  if ((updatedProfile.credits || 0) < creditsNeeded) {
    return {
      success: false,
      error: `Insufficient credits. You need ${creditsNeeded} credit(s), you have ${updatedProfile.credits || 0}.`
    }
  }

  // Deduct credits
  const newBalance = (updatedProfile.credits || 0) - creditsNeeded

  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', profile.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    profile_id: profile.id,
    amount: -creditsNeeded,
    type: isPermanent ? 'license_permanent' : 'license_30d',
    description: isPermanent ? 'Permanent license created' : '30-day license created',
    created_by: profile.id,
  })

  return { success: true, creditsDeducted: creditsNeeded }
}

// Get credit transactions for a profile
export async function getCreditTransactions(profileId?: string): Promise<CreditTransaction[]> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) return []

  let query = supabase
    .from('credit_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (currentProfile.role === 'super_admin' && profileId) {
    query = query.eq('profile_id', profileId)
  } else if (currentProfile.role !== 'super_admin') {
    // Non-super-admins can only see their own transactions
    query = query.eq('profile_id', currentProfile.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data || []
}

// Get all resellers with their credit info (super_admin only)
export async function getResellersWithCredits(): Promise<Profile[]> {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching resellers:', error)
    return []
  }

  return data || []
}

// Get credit stats for dashboard
export async function getCreditStats() {
  const supabase = await createClient()
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    return { totalCredits: 0, totalTransactions: 0, creditsUsedThisMonth: 0 }
  }

  if (currentProfile.role === 'super_admin') {
    // Get all resellers' credits
    const { data: resellers } = await supabase
      .from('profiles')
      .select('credits')
      .eq('role', 'admin')

    const totalCredits = resellers?.reduce((sum, r) => sum + (r.credits || 0), 0) || 0

    // Get this month's transactions
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('amount')
      .lt('amount', 0)
      .gte('created_at', startOfMonth.toISOString())

    const creditsUsedThisMonth = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    return {
      totalCredits,
      totalTransactions: transactions?.length || 0,
      creditsUsedThisMonth,
    }
  }

  // For resellers, return their own stats
  return {
    totalCredits: currentProfile.credits || 0,
    totalTransactions: 0,
    creditsUsedThisMonth: 0,
  }
}
