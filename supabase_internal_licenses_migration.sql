-- ============================================
-- MIGRATION: Internal / VPS licenses
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Flag column: internal keys never expire, allow unlimited devices and
--    cost no credits. Only a super_admin can create them from the manager.
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill the internal keys created by hand before this column existed
UPDATE licenses
SET is_internal = true
WHERE is_internal = false
  AND expires_at IS NULL
  AND max_activations >= 999
  AND customer_name ILIKE 'INTERNAL VPS%';

-- 3. Index so the dashboard can filter internal keys cheaply
CREATE INDEX IF NOT EXISTS idx_licenses_is_internal ON licenses(is_internal);

-- ============================================
-- VERIFICATION (run to check)
-- ============================================
-- Internal keys and how many distinct devices are using each one:
-- SELECT l.license_key, l.customer_name, l.is_active,
--        COUNT(DISTINCT da.hardware_id) AS devices
-- FROM licenses l
-- LEFT JOIN device_activations da ON da.license_key = l.license_key
-- WHERE l.is_internal
-- GROUP BY l.license_key, l.customer_name, l.is_active
-- ORDER BY devices DESC;
