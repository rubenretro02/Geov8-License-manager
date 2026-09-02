-- ============================================
-- MIGRATION: Location rules pushed to the desktop app (per license)
-- Run this in Supabase SQL Editor
-- ============================================

-- Allowed countries / states the desktop app checks against. With
-- lock_location_settings = true the app enforces these lists and locks the
-- fields for the end user; only the admin / creator changes them here.
-- Empty lists mean "no restriction".
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS allowed_countries TEXT[];
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS allowed_states TEXT[];
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS lock_location_settings BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- VERIFICATION (run to check)
-- ============================================
-- SELECT license_key, customer_name, allowed_countries, allowed_states, lock_location_settings
-- FROM licenses
-- WHERE lock_location_settings;
