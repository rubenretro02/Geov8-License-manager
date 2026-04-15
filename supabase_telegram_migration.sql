-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Telegram Auto-Link System + WhatsApp Phone Field
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Table for temporary Telegram linking codes
CREATE TABLE IF NOT EXISTS telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hardware_id TEXT,  -- For linking from App.py (by HWID)
  chat_id TEXT,
  telegram_username TEXT,
  telegram_first_name TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_telegram_links_code ON telegram_links(code);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_telegram_links_expires ON telegram_links(expires_at);

-- 2. Add phone_number to licenses table (for WhatsApp contact)
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Change telegram_chat_id to support multiple chat IDs (comma-separated)
-- The column already exists, we just need to ensure it can hold multiple IDs
-- No change needed - it's already TEXT type

-- 4. Add telegram_chat_ids (plural) to profiles for multiple Telegrams
-- We'll store as JSON array for cleaner handling
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_ids JSONB DEFAULT '[]'::jsonb;

-- 5. Enable RLS on telegram_links
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;

-- 6. Policies for telegram_links
-- Users can read their own links
CREATE POLICY "Users can read own telegram_links" ON telegram_links
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own links
CREATE POLICY "Users can insert own telegram_links" ON telegram_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own links
CREATE POLICY "Users can update own telegram_links" ON telegram_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete own telegram_links" ON telegram_links
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can do anything (for webhook)
CREATE POLICY "Service role full access telegram_links" ON telegram_links
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Function to clean up expired telegram_links (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_links()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_links WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- DONE!
-- After running this, set TELEGRAM_BOT_TOKEN in your .env.local
-- Token: 8540683624:AAHEbhdlr8duJpoAfIlgwWSQwx_7U0MI0EE
-- ═══════════════════════════════════════════════════════════════
