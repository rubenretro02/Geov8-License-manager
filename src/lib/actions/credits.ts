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

    // Ensure admins have a default trial_limit if not set
    const updateData: Record<string, unknown> = {
      trials_used_this_month: 0,
      trial_reset_date: nextReset.toISOString(),
    }

    // If trial_limit is 0 or null for an admin, set default
    if (profile.role === 'admin' && (!profile.trial_limit || profile.trial_limit === 0)) {
      updateData.trial_limit = 20
    }

    const { data } = await supabase
      .from('profiles')
      .update(updateData)
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

// Get the admin profile for a user (for credits/trials)
// For self-registered users (admin_id is null or equals their own id), return their own profile
async function getAdminProfileForUser(profile: Profile): Promise<Profile | null> {
  if (profile.role === 'admin') {
    return profile
  }

  if (profile.role === 'user') {
    // Self-registered user: admin_id is null or equals their own id
    // They use their own profile for credits/trials
    const isSelfRegistered = !profile.admin_id || profile.admin_id === profile.id

    if (isSelfRegistered) {
      return profile // Use their own profile
    }

    // User created by admin: fetch the admin's profile
    const supabase = await createClient()
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.admin_id)
      .single()

    return adminProfile || null
  }

  return null
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

// Calculate credits for a given number of days (1 credit = 1 day, no decimals)
// Special pricing: 365 days = only 200 credits (44% discount)
export async function calculateCreditsForDays(daysValid: number, isPermanent: boolean): Promise<number> {
  if (isPermanent) return 300 // Permanent licenses cost 300 credits

  // Special pricing for yearly licenses (365 days = 200 credits)
  if (daysValid === 365) return 200

  // For ranges close to 365, apply proportional discount
  // 360-370 days = 200 credits
  if (daysValid >= 360 && daysValid <= 370) return 200

  return Math.floor(daysValid) // 1 credit per day, no decimals
}

// Deduct credits for license creation
// IMPORTANT: Users use their admin's credits and trial limits
export async function deductCreditsForLicense(
  isPermanent: boolean,
  isTrial: boolean,
  daysValid: number = 30
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

  // For Users, get their admin's profile for credits/trials
  // For Admins, use their own profile
  let creditProfile: Profile | null = null

  if (profile.role === 'user') {
    creditProfile = await getAdminProfileForUser(profile)
    if (!creditProfile) {
      return { success: false, error: 'Admin not found. Contact administrator.' }
    }
  } else {
    creditProfile = profile
  }

  // Check and reset trials if needed (on the admin's profile)
  const updatedCreditProfile = await checkAndResetTrials(creditProfile)

  // Handle trial licenses
  if (isTrial) {
    // Check if user is self-registered (admin_id === their id OR admin_id is null)
    const isSelfRegisteredUser = profile.role === 'user' &&
      (profile.admin_id === profile.id || !profile.admin_id)

    // Self-registered users are ALWAYS limited to 1 trial per month
    // Regardless of what trial_limit says in the database
    const effectiveTrialLimit = isSelfRegisteredUser ? 1 : updatedCreditProfile.trial_limit

    // trial_limit of 0 or null means unlimited trials (except for self-registered users)
    const hasLimit = isSelfRegisteredUser || (effectiveTrialLimit !== null && effectiveTrialLimit > 0)

    if (hasLimit && (updatedCreditProfile.trials_used_this_month || 0) >= (effectiveTrialLimit || 1)) {
      return {
        success: false,
        error: isSelfRegisteredUser
          ? 'You have used your free trial this month. Purchase credits to create more licenses.'
          : `Trial limit reached (${effectiveTrialLimit}/month). Contact administrator.`
      }
    }

    // Increment trials used on the ADMIN's profile (not the user's)
    await supabase
      .from('profiles')
      .update({ trials_used_this_month: (updatedCreditProfile.trials_used_this_month || 0) + 1 })
      .eq('id', creditProfile.id)

    return { success: true, creditsDeducted: 0 }
  }

  // Calculate credits needed
  const creditsNeeded = await calculateCreditsForDays(daysValid, isPermanent)

  if ((updatedCreditProfile.credits || 0) < creditsNeeded) {
    return {
      success: false,
      error: `Insufficient credits. You need ${creditsNeeded} credit(s), available: ${updatedCreditProfile.credits || 0}.`
    }
  }

  // Deduct credits from the ADMIN's profile (not the user's)
  const newBalance = Math.floor((updatedCreditProfile.credits || 0) - creditsNeeded)

  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', creditProfile.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // Record transaction (on the admin's profile)
  await supabase.from('credit_transactions').insert({
    profile_id: creditProfile.id,
    amount: -creditsNeeded,
    type: isPermanent ? 'license_permanent' : 'license_30d',
    description: isPermanent
      ? `Permanent license created by ${profile.username || profile.email}`
      : `License created (${daysValid} days) by ${profile.username || profile.email}`,
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

// Get the credits info that a user should see (their admin's credits if they're a user)
export async function getCreditsInfoForDisplay(): Promise<{ credits: number; trialsRemaining: number | null; trialLimit: number | null; trialsUsed: number }> {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { credits: 0, trialsRemaining: null, trialLimit: null, trialsUsed: 0 }
  }

  if (profile.role === 'super_admin') {
    return { credits: 999999, trialsRemaining: null, trialLimit: null, trialsUsed: 0 }
  }

  // Check if user is self-registered (admin_id === their id OR admin_id is null)
  const isSelfRegisteredUser = profile.role === 'user' &&
    (profile.admin_id === profile.id || !profile.admin_id)

  // For users, get admin's credits (for self-registered, this is their own profile)
  let creditProfile = profile
  if (profile.role === 'user' && profile.admin_id) {
    const adminProfile = await getAdminProfileForUser(profile)
    if (adminProfile) {
      creditProfile = adminProfile
    }
  }

  // Self-registered users always have trial_limit = 1
  const effectiveTrialLimit = isSelfRegisteredUser ? 1 : creditProfile.trial_limit
  const trialsUsed = creditProfile.trials_used_this_month || 0
  const trialsRemaining = effectiveTrialLimit && effectiveTrialLimit > 0
    ? Math.max(0, effectiveTrialLimit - trialsUsed)
    : null

  return {
    credits: creditProfile.credits || 0,
    trialsRemaining,
    trialLimit: effectiveTrialLimit,
    trialsUsed,
  }
}
