-- ============================================
-- MIGRATION: Add admin_id column to profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add admin_id column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- 2. For existing self-registered users (role='user' with no admin_id),
-- set admin_id to their own id
UPDATE profiles
SET admin_id = id
WHERE role = 'user' AND admin_id IS NULL;

-- 3. For admins, set admin_id to their own id (optional, for consistency)
UPDATE profiles
SET admin_id = id
WHERE role = 'admin' AND admin_id IS NULL;

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin_id ON profiles(admin_id);

-- ============================================
-- VERIFICATION (run to check)
-- ============================================
-- SELECT id, username, email, role, admin_id,
--        CASE WHEN admin_id = id THEN 'self-registered' ELSE 'created by admin' END as user_type
-- FROM profiles
-- WHERE role = 'user';
