-- ============================================
-- MIGRATION: Orders Table for Payment Tracking
-- Run this in Supabase SQL Editor
-- ============================================

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  customer_name TEXT,
  amount DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  type TEXT NOT NULL DEFAULT 'credits', -- 'credits' or 'license'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired
  payment_id TEXT, -- NOWPayments payment_id
  payment_url TEXT, -- NOWPayments invoice URL
  payment_address TEXT, -- Crypto payment address
  pay_currency TEXT, -- Selected crypto currency
  actually_paid DECIMAL(20,8), -- Amount actually paid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update orders (for webhook)
CREATE POLICY "Service can update orders" ON orders
  FOR UPDATE USING (true);

-- Super admins can view all orders
CREATE POLICY "Super admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- VERIFICATION (optional)
-- ============================================
-- SELECT * FROM orders LIMIT 10;
