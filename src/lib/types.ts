export type UserRole = 'super_admin' | 'admin' | 'user'

export interface Profile {
  id: string
  username: string
  email: string
  full_name: string | null
  role: UserRole
  admin_id: string | null // For users: the admin they belong to. For admins: their own id. For super_admin: null
  created_at: string
  updated_at: string
  // Credit system
  credits: number
  trial_limit: number // Max trials per month
  trials_used_this_month: number
  trial_reset_date: string | null // When trials reset
}

export interface CreditTransaction {
  id: string
  profile_id: string
  amount: number // Positive for additions, negative for deductions
  type: 'purchase' | 'license_30d' | 'license_permanent' | 'adjustment' | 'refund'
  description: string | null
  license_id: string | null
  created_at: string
  created_by: string // Who made the transaction
}

export interface License {
  id: string
  license_key: string
  customer_name: string | null
  customer_email: string | null
  hwid: string | null
  is_active: boolean
  is_paid: boolean
  is_trial: boolean
  payment_amount: number | null
  payment_date: string | null
  payment_method: string | null
  expires_at: string | null
  activated_at: string | null
  created_at: string
  notes: string | null
  current_activations: number
  max_activations: number
  created_by: string | null // User who created the license
  created_by_name?: string | null // Username of creator (populated for admin/super_admin view)
  created_by_email?: string | null // Email of creator (populated for super_admin view)
  created_by_admin_name?: string | null // Admin group name (populated for super_admin view)
  admin_id: string | null // Admin/team this license belongs to
}

export interface CheckLog {
  id: string
  hwid: string
  license_key: string | null
  ip_address: string | null
  ip_country: string | null
  ip_state: string | null
  ip_city: string | null
  gps_country: string | null
  gps_state: string | null
  gps_city: string | null
  status: string
  message: string | null
  created_at: string
  // Joined from licenses table
  customer_name?: string | null
}

export interface Configuration {
  id: string
  hardware_id: string
  username: string | null
  password: string | null
  latitude: string | null
  longitude: string | null
  allowed_countries: string[] | null
  allowed_states: string[] | null
  service_interval: string | null
  created_at: string
  updated_at: string
}

export type LicenseFormData = {
  customer_name: string
  customer_email: string
  days_valid: number
  is_paid: boolean
  payment_amount: number
  payment_method: string
  notes: string
}

export type CreateUserFormData = {
  email: string
  password: string
  username: string
  full_name: string
  role: 'admin' | 'user'
}
