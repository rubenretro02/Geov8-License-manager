'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { License, LicenseFormData, Profile } from '@/lib/types'

// Generate random license key
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segments: string[] = []

  for (let s = 0; s < 4; s++) {
    let segment = ''
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)]
    }
    segments.push(segment)
  }

  return segments.join('-')
}

// Get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

// Get admin_id for the current user (for filtering)
async function getAdminIdForUser(): Promise<string | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // Super admin sees everything
  if (profile.role === 'super_admin') return null

  // Admin's admin_id is their own id
  if (profile.role === 'admin') return profile.id

  // User's admin_id is their parent admin
  return profile.admin_id
}

export async function getLicenses(): Promise<License[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  let query = supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false })

  // Filter based on role
  if (profile.role === 'super_admin') {
    // Super admin sees everything - no filter needed
  } else if (profile.role === 'admin') {
    // Admin sees licenses where admin_id = their id
    query = query.eq('admin_id', profile.id)
  } else {
    // Regular user - ONLY see their own licenses (created_by = their id)
    // OR licenses where they are the customer (admin_id = their id for self-purchases)
    // This prevents users without admin_id from seeing all licenses
    query = query.or(`created_by.eq.${profile.id},admin_id.eq.${profile.id}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching licenses:', error)
    return []
  }

  // Populate created_by info for admin and super_admin
  if ((profile.role === 'super_admin' || profile.role === 'admin') && data && data.length > 0) {
    const creatorIds = [...new Set(data.map(l => l.created_by).filter(Boolean))]

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, admin_id')
        .in('id', creatorIds)

      if (profile.role === 'super_admin') {
        // For super_admin: also resolve admin group names
        const adminIds = [...new Set(profiles?.map(p => p.admin_id).filter(Boolean) || [])]
        let adminNameMap = new Map<string, string>()

        if (adminIds.length > 0) {
          const { data: adminProfiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', adminIds)

          adminNameMap = new Map(adminProfiles?.map(p => [p.id, p.username]) || [])
        }

        const profileMap = new Map(
          profiles?.map(p => [p.id, {
            username: p.username,
            email: p.email,
            admin_name: p.admin_id ? adminNameMap.get(p.admin_id) || null : null,
          }]) || []
        )

        return data.map(license => {
          const creator = license.created_by ? profileMap.get(license.created_by) : null
          return {
            ...license,
            created_by_name: creator?.username || null,
            created_by_email: creator?.email || null,
            created_by_admin_name: creator?.admin_name || null,
          }
        })
      } else {
        // For admin: just show username
        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || [])

        return data.map(license => ({
          ...license,
          created_by_name: license.created_by ? profileMap.get(license.created_by) || null : null,
        }))
      }
    }
  }

  return data || []
}

export async function getLicenseByKey(licenseKey: string): Promise<License | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .single()

  if (error) {
    console.error('Error fetching license:', error)
    return null
  }

  return data
}

export async function createLicense(formData: LicenseFormData): Promise<{ success: boolean; licenseKey?: string; error?: string; creditsUsed?: number }> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { success: false, error: 'Unauthorized' }
  }

  const isTrial = formData.is_trial || false
  const isPermanent = formData.is_permanent || formData.days_valid === 0

  // Check credits/trials BEFORE creating license (skip for super_admin)
  let creditsDeducted = 0
  if (profile.role !== 'super_admin') {
    const { deductCreditsForLicense } = await import('./credits')
    const creditResult = await deductCreditsForLicense(isPermanent, isTrial || false, formData.days_valid)

    if (!creditResult.success) {
      return { success: false, error: creditResult.error }
    }
    creditsDeducted = creditResult.creditsDeducted || 0
  }

  const licenseKey = generateLicenseKey()

  // Determine admin_id based on role
  let adminId: string | null = null
  if (profile.role === 'super_admin') {
    // Super admin licenses also get an admin_id (their own) so they appear in logs
    adminId = profile.id
  } else if (profile.role === 'admin') {
    adminId = profile.id
  } else if (profile.role === 'user') {
    adminId = profile.admin_id
  }

  // Check if user is self-registered (admin_id === their id OR admin_id is null)
  const isSelfRegisteredUser = profile.role === 'user' &&
    (profile.admin_id === profile.id || !profile.admin_id)

  // Calculate days valid - trials have different limits:
  // - Self-registered users: max 1 day
  // - Users created by admin: max 5 days
  // - Admins: max 5 days
  const maxTrialDays = isSelfRegisteredUser ? 1 : 5

  let daysValid = formData.days_valid
  if (isTrial && daysValid > maxTrialDays) {
    daysValid = maxTrialDays
  }
  if (isTrial && daysValid <= 0) {
    daysValid = maxTrialDays
  }

  // Get alert settings from formData (with defaults - all OFF by default)
  const alertSettings = {
    alert_enabled: 'alert_enabled' in formData ? (formData as Record<string, unknown>).alert_enabled : false,
    alert_ip: 'alert_ip' in formData ? (formData as Record<string, unknown>).alert_ip : false,
    alert_gps: 'alert_gps' in formData ? (formData as Record<string, unknown>).alert_gps : false,
    alert_on_fail: 'alert_on_fail' in formData ? (formData as Record<string, unknown>).alert_on_fail : false,
    alert_on_success: 'alert_on_success' in formData ? (formData as Record<string, unknown>).alert_on_success : false,
  }

  // Get phone_number from formData
  const phoneNumber = 'phone_number' in formData ? (formData as Record<string, unknown>).phone_number as string : null

  // Get auto_renew settings
  const autoRenew = 'auto_renew' in formData ? (formData as Record<string, unknown>).auto_renew as boolean : false
  const autoRenewDays = 'auto_renew_days' in formData ? (formData as Record<string, unknown>).auto_renew_days as number : formData.days_valid

  // Determine payment status:
  // - Trials are always unpaid (free)
  // - Super admin: use form data (manual control)
  // - Others: if credits were deducted, mark as paid automatically
  const paidWithCredits = !isTrial && creditsDeducted > 0
  const isPaid = isTrial ? false : (profile.role === 'super_admin' ? formData.is_paid : paidWithCredits || formData.is_paid)

  const licenseData: Partial<License> = {
    license_key: licenseKey,
    customer_name: formData.customer_name || null,
    customer_email: formData.customer_email || null,
    phone_number: phoneNumber || null,
    is_active: true,
    is_paid: isPaid,
    is_trial: isTrial || false,
    payment_amount: paidWithCredits ? creditsDeducted : (formData.is_paid && !isTrial ? formData.payment_amount : null),
    payment_method: paidWithCredits ? 'credits' : (formData.is_paid && !isTrial ? formData.payment_method : null),
    payment_date: isPaid ? new Date().toISOString() : null,
    notes: formData.notes || null,
    current_activations: 0,
    max_activations: 1,
    created_by: profile.id,
    admin_id: adminId,
    // Auto renewal (disabled for trials and permanent)
    auto_renew: isTrial || isPermanent ? false : autoRenew,
    auto_renew_days: autoRenewDays || formData.days_valid,
    // Alert settings
    alert_enabled: alertSettings.alert_enabled as boolean,
    alert_ip: alertSettings.alert_ip as boolean,
    alert_gps: alertSettings.alert_gps as boolean,
    alert_on_fail: alertSettings.alert_on_fail as boolean,
    alert_on_success: alertSettings.alert_on_success as boolean,
  }

  // Set expiration date
  if (isTrial || daysValid > 0) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (isTrial ? daysValid : formData.days_valid))
    licenseData.expires_at = expiresAt.toISOString()
  }

  const { error } = await supabase.from('licenses').insert([licenseData])

  if (error) {
    console.error('Error creating license:', error)
    return { success: false, error: error.message }
  }

  // Calculate proportional credits used
  const { calculateCreditsForDays } = await import('./credits')
  const creditsUsed = isTrial ? 0 : await calculateCreditsForDays(formData.days_valid, isPermanent)

  revalidatePath('/')
  return { success: true, licenseKey, creditsUsed }
}

export async function updateLicense(
  licenseKey: string,
  updates: Partial<License>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('licenses')
    .update(updates)
    .eq('license_key', licenseKey)

  if (error) {
    console.error('Error updating license:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function updateLicenseAlerts(
  licenseKey: string,
  alertSettings: {
    alert_enabled: boolean
    alert_ip: boolean
    alert_gps: boolean
    alert_on_fail: boolean
    alert_on_success: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('licenses')
    .update(alertSettings)
    .eq('license_key', licenseKey)

  if (error) {
    console.error('Error updating license alerts:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function renewLicense(
  licenseKey: string,
  daysToAdd: number
): Promise<{ success: boolean; newExpiry?: string; error?: string; creditsUsed?: number }> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { success: false, error: 'Unauthorized' }
  }

  // Calculate credits needed proportionally (1 credit = 30 days)
  const { calculateCreditsForDays } = await import('./credits')
  const creditsNeeded = await calculateCreditsForDays(daysToAdd, false)

  // Deduct credits for non-super_admin users
  if (profile.role !== 'super_admin' && creditsNeeded > 0) {
    // Check if user has enough credits
    if ((profile.credits || 0) < creditsNeeded) {
      return {
        success: false,
        error: `Insufficient credits. You need ${creditsNeeded} credit(s), you have ${profile.credits || 0}.`
      }
    }

    // Deduct credits (no decimals)
    const newBalance = Math.floor((profile.credits || 0) - creditsNeeded)
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', profile.id)

    if (creditError) {
      return { success: false, error: creditError.message }
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      profile_id: profile.id,
      amount: -creditsNeeded,
      type: 'license_30d',
      description: `License renewed (${daysToAdd} days = ${creditsNeeded} credits)`,
      created_by: profile.id,
    })
  }

  // Get current license
  const { data: license, error: fetchError } = await supabase
    .from('licenses')
    .select('expires_at')
    .eq('license_key', licenseKey)
    .single()

  if (fetchError || !license) {
    return { success: false, error: 'License not found' }
  }

  // Calculate new expiry date
  let baseDate = new Date()
  if (license.expires_at) {
    const currentExpiry = new Date(license.expires_at)
    // If not expired yet, extend from current expiry
    if (currentExpiry > baseDate) {
      baseDate = currentExpiry
    }
  }

  baseDate.setDate(baseDate.getDate() + daysToAdd)
  const newExpiry = baseDate.toISOString()

  const { error } = await supabase
    .from('licenses')
    .update({
      expires_at: newExpiry,
      is_active: true,
    })
    .eq('license_key', licenseKey)

  if (error) {
    console.error('Error renewing license:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, newExpiry, creditsUsed: profile.role === 'super_admin' ? 0 : creditsNeeded }
}

export async function toggleLicenseStatus(
  licenseKey: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateLicense(licenseKey, { is_active: isActive })
}

export async function resetHwid(licenseKey: string): Promise<{ success: boolean; error?: string }> {
  return updateLicense(licenseKey, {
    hwid: null,
    activated_at: null,
    current_activations: 0,
  })
}

export async function deleteLicense(licenseKey: string): Promise<{ success: boolean; error?: string; creditsRefunded?: number }> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  // Only super_admin and admin can delete
  if (!profile || profile.role === 'user') {
    return { success: false, error: 'Unauthorized' }
  }

  // Fetch the license before deleting to calculate refund
  const { data: license, error: fetchError } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .single()

  if (fetchError || !license) {
    return { success: false, error: 'License not found' }
  }

  // Calculate credit refund for unused days
  let creditsRefunded = 0
  const shouldRefund = !license.is_trial && license.expires_at && license.created_by

  if (shouldRefund) {
    const now = new Date()
    const createdAt = new Date(license.created_at)
    const expiresAt = new Date(license.expires_at!)

    const totalDays = Math.max(1, Math.ceil((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    const daysUsed = Math.max(0, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, totalDays - daysUsed)

    if (daysRemaining > 0) {
      const { calculateCreditsForDays } = await import('./credits')
      creditsRefunded = await calculateCreditsForDays(daysRemaining, false)

      // Refund credits to the user who created the license
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', license.created_by)
        .single()

      if (creatorProfile) {
        // No decimals in credits
        const newBalance = Math.floor((creatorProfile.credits || 0) + creditsRefunded)

        await supabase
          .from('profiles')
          .update({ credits: newBalance })
          .eq('id', license.created_by)

        // Record refund transaction
        await supabase.from('credit_transactions').insert({
          profile_id: license.created_by,
          amount: creditsRefunded,
          type: 'refund',
          description: `Refund: license deleted with ${daysRemaining} days remaining (${creditsRefunded} credits)`,
          created_by: profile.id,
        })
      }
    }
  }

  const { error } = await supabase
    .from('licenses')
    .delete()
    .eq('license_key', licenseKey)

  if (error) {
    console.error('Error deleting license:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, creditsRefunded }
}

export async function markAsPaid(
  licenseKey: string,
  amount: number,
  method: string
): Promise<{ success: boolean; error?: string }> {
  return updateLicense(licenseKey, {
    is_paid: true,
    payment_amount: amount,
    payment_method: method,
    payment_date: new Date().toISOString(),
  })
}

export async function getCheckLogs(licenseKey?: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return []

  // First, get the license keys that belong to this admin/user
  let allowedLicenseKeys: string[] = []

  if (profile.role !== 'super_admin') {
    // Get licenses that belong to this admin/user
    // For admins: use their own ID
    // For users: use their admin_id (which could be their own ID if self-registered)
    const adminId = profile.role === 'admin' ? profile.id : profile.admin_id

    console.log('[getCheckLogs] Profile role:', profile.role, 'Admin ID:', adminId)

    // If no admin_id, user cannot see any logs (security fix)
    if (!adminId) {
      console.log('[getCheckLogs] No admin_id found, returning empty for security')
      return []
    }

    const { data: adminLicenses } = await supabase
      .from('licenses')
      .select('license_key')
      .eq('admin_id', adminId)

    allowedLicenseKeys = adminLicenses?.map(l => l.license_key) || []

    console.log('[getCheckLogs] Found', allowedLicenseKeys.length, 'licenses for admin:', allowedLicenseKeys)

    // If no licenses belong to this admin, return empty
    if (allowedLicenseKeys.length === 0) {
      console.log('[getCheckLogs] No licenses found for this admin, returning empty')
      return []
    }
  }

  // Get ALL logs - no limit to allow historical searches
  let query = supabase
    .from('check_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (licenseKey) {
    query = query.eq('license_key', licenseKey)
  }

  // Filter by allowed license keys for non-super_admin users
  if (profile.role !== 'super_admin' && allowedLicenseKeys.length > 0) {
    query = query.in('license_key', allowedLicenseKeys)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching check logs:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Get unique license keys from logs
  const licenseKeys = [...new Set(data.map(log => log.license_key).filter(Boolean))]

  // Fetch license details to get customer names
  const { data: licenses } = await supabase
    .from('licenses')
    .select('license_key, customer_name')
    .in('license_key', licenseKeys)

  // Create a map of license_key -> customer_name
  const licenseMap = new Map(
    licenses?.map(l => [l.license_key, l.customer_name]) || []
  )

  // Add customer_name to each log
  const logsWithNames = data.map(log => ({
    ...log,
    customer_name: log.license_key ? licenseMap.get(log.license_key) : null
  }))

  return logsWithNames
}

export async function getLicenseStats() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) return { total: 0, active: 0, expired: 0, paid: 0, unpaid: 0, revenue: 0 }

  let query = supabase.from('licenses').select('*')

  // Filter based on role (same logic as getLicenses)
  if (profile.role === 'super_admin') {
    // Super admin sees everything - no filter needed
  } else if (profile.role === 'admin') {
    // Admin sees licenses where admin_id = their id
    query = query.eq('admin_id', profile.id)
  } else {
    // Regular user - ONLY see their own licenses
    query = query.or(`created_by.eq.${profile.id},admin_id.eq.${profile.id}`)
  }

  const { data: licenses } = await query

  if (!licenses) return { total: 0, active: 0, expired: 0, paid: 0, unpaid: 0, revenue: 0 }

  const now = new Date()

  const stats = {
    total: licenses.length,
    active: licenses.filter((l) => l.is_active && (!l.expires_at || new Date(l.expires_at) > now)).length,
    expired: licenses.filter((l) => l.expires_at && new Date(l.expires_at) <= now).length,
    paid: licenses.filter((l) => l.is_paid).length,
    unpaid: licenses.filter((l) => !l.is_paid).length,
    revenue: licenses.reduce((sum, l) => sum + (l.payment_amount || 0), 0),
  }

  return stats
}
