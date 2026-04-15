-- ============================================
-- MIGRATION: Add Alert Filters
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add admin-level alert filters to profiles table
-- These control what alerts the admin/user wants to receive

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS admin_alert_on_fail BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_alert_on_success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_alert_ip BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_alert_gps BOOLEAN DEFAULT true;

-- 2. Add agent-level alert filters to configurations table
-- These are set by the agent in the App.py

ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_chat_ids TEXT,
ADD COLUMN IF NOT EXISTS alert_on_fail BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_on_success BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS alert_ip BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_gps BOOLEAN DEFAULT true;

-- 3. Update existing licenses to have default alert settings
-- This ensures old licenses work correctly

UPDATE licenses
SET
    alert_enabled = COALESCE(alert_enabled, false),
    alert_ip = COALESCE(alert_ip, true),
    alert_gps = COALESCE(alert_gps, true),
    alert_on_fail = COALESCE(alert_on_fail, true),
    alert_on_success = COALESCE(alert_on_success, false)
WHERE alert_ip IS NULL OR alert_gps IS NULL OR alert_on_fail IS NULL OR alert_on_success IS NULL;

-- 4. Set default values for future inserts
-- (These should already exist but just in case)

ALTER TABLE licenses
ALTER COLUMN alert_ip SET DEFAULT true,
ALTER COLUMN alert_gps SET DEFAULT true,
ALTER COLUMN alert_on_fail SET DEFAULT true,
ALTER COLUMN alert_on_success SET DEFAULT false;

-- ============================================
-- VERIFICATION QUERIES (optional - run to check)
-- ============================================

-- Check profiles columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name LIKE 'admin_alert%';

-- Check configurations columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'configurations' AND column_name IN ('telegram_enabled', 'telegram_chat_ids', 'alert_on_fail', 'alert_on_success', 'alert_ip', 'alert_gps');

-- Check licenses have proper defaults
-- SELECT license_key, alert_enabled, alert_ip, alert_gps, alert_on_fail, alert_on_success
-- FROM licenses
-- LIMIT 10;
