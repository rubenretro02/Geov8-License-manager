-- ============================================
-- MIGRATION: Team license sharing (per user)
-- Run this in the Supabase SQL Editor
-- ============================================
--
-- Adds a PER-USER flag, set on each sub-user's own profile row. When an admin
-- turns it on for a specific user (from the Team page), that user can VIEW and
-- manage all of the team's licenses (admin_id = their admin), instead of only
-- the ones they created themselves. The admin decides per user, not globally.
--
-- No RLS change is required: the existing "licenses_select"/"licenses_update"
-- policies already let a team member read/update rows where
-- admin_id = (their admin_id). The flag is enforced at the application layer.
-- The admin sets it on each user's row via the service role (RLS does not let
-- an admin write another profile directly).

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS share_licenses_with_team BOOLEAN DEFAULT false;

-- Backfill existing rows to the explicit default
UPDATE profiles
SET share_licenses_with_team = false
WHERE share_licenses_with_team IS NULL;

-- ============================================
-- VERIFICATION (optional)
-- ============================================
-- SELECT id, username, role, share_licenses_with_team
-- FROM profiles
-- WHERE role = 'admin';
