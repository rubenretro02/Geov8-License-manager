-- ============================================
-- MIGRATION: Team license sharing
-- Run this in the Supabase SQL Editor
-- ============================================
--
-- Adds a per-admin flag. When an admin enables it, every sub-user that belongs
-- to that admin (profiles.admin_id = admin.id) can VIEW all of the team's
-- licenses (including the admin's own), instead of only the licenses they
-- created themselves.
--
-- No RLS change is required: the existing "licenses_select" policy already lets
-- a user read rows where admin_id = (their admin_id). The flag is enforced at
-- the application layer so the admin stays in control of when it is on.

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
