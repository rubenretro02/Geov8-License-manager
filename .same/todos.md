# GeoV8 License Store - Conversion Tasks

## Completed
- [x] Clone repository
- [x] Move dashboard from `/` to `/dashboard`
- [x] Create landing page at `/`
- [x] Hide money stats (paid, unpaid, revenue) for regular users
- [x] Update header navigation to point to `/dashboard`
- [x] Create store page with checkout flow
- [x] Create NOWPayments integration API routes
- [x] Create demo payment mode for testing
- [x] Create payment success page
- [x] Update middleware for public routes
- [x] Update auth to redirect to `/dashboard` after login
- [x] Handle store page for logged-out users
- [x] **FIX SECURITY BUG**: Users without admin_id could see ALL licenses
- [x] Implement hybrid payment system:
  - Users → Get license automatically when paying
  - Admins → Get credits when paying (1 credit = 1 day)
- [x] Add credit plans for admins (Starter $50/100cr, Pro $120/300cr, Enterprise $350/1000cr)
- [x] Add `credit_price` field to Profile for custom pricing per admin
- [x] Add subscription tracking fields to Profile
- [x] Create subscription endpoint for admin credit purchases
- [x] Update webhook to handle both license and credit payments
- [x] Update store page with tabs for admins (Credits / Personal License)
- [x] Create demo-subscription page for testing credit purchases
- [x] **CREDIT PLANS**: Added Monthly ($30/30cr), Yearly ($200/365 days), Lifetime ($300) plans
- [x] **CUSTOM AMOUNT**: Users can enter custom credit amounts
- [x] **365-DAY DISCOUNT**: 365 days only costs 200 credits (not 365)
- [x] **ORDERS TABLE**: Created orders table migration for payment tracking
- [x] **ORDERS PAGE**: Created /orders page with payment status tracking
- [x] **API UPDATES**: Updated payment/create API to save orders to database
- [x] **WEBHOOK UPDATES**: Updated webhook to update order status on payment events
- [x] **ORDERS IN MENU**: Added Orders link in the header navigation
- [x] **STORE PAGE TEXT**: Updated to say "Buy Credits" instead of "Purchase License"
- [x] **CREDITS IN HEADER**: Show credits for all users (admin + user), not just admins
- [x] **SELF-REGISTERED USERS**: Set admin_id to own UUID + trial_limit = 1 for self-signup
- [x] **1-DAY TRIAL LIMIT**: Self-registered users can only create 1-day trials (max)
- [x] **MANUAL PAYMENT CONFIRMATION**: Added /api/payments/confirm endpoint and "Confirm" button on orders page

## In Progress
- [ ] Add NOWPayments subscription API integration (currently using invoice as fallback)

## Future Enhancements
- [ ] Add email notifications for license delivery
- [ ] Add more payment options
- [ ] Create license renewal flow improvements
- [ ] Add user registration flow improvements
- [ ] Add custom pricing per admin (use credit_price field)
- [ ] Add subscription management (cancel, pause)
- [ ] Add expiration notifications (email/telegram)

## Environment Variables Required
```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NOWPayments (for production)
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_nowpayments_ipn_secret

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Fields Added
Add these columns to your Supabase `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_price DECIMAL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
```

## NEW: Orders Table Migration
Run `supabase_orders_migration.sql` in Supabase SQL Editor to create the orders table.

## Payment System Summary

### Credit Pricing (for store)
- **Monthly**: $30 for 30 credits (30 days)
- **Yearly**: $200 for 365 days (only 200 credits - 44% discount!)
- **Lifetime**: $300 for permanent license (300 credits)
- **Custom**: $1 per credit (or custom price from profile.credit_price)

### Credit Deduction (for license creation)
- **1 credit = 1 day** of license validity
- **365 days = 200 credits** (special discount for yearly)
- **Permanent = 300 credits**
- **Trials = FREE** (uses admin's trial limit)

### For Users (role='user')
- Buy license plans: Monthly ($30), Yearly ($200), Lifetime ($300)
- License is created automatically upon payment
- License is tied to their account (admin_id = user.id)

### For Admins (role='admin')
- Buy credit plans or custom amounts
- Credits added to their account upon payment
- Use credits to create licenses for clients
- Can also buy personal licenses if needed

### Self-Registered Users (sign up via /register)
- Get their own UUID as `admin_id` (self-managed)
- Get 1 trial per month (`trial_limit = 1`)
- Trial licenses limited to max 1 day
- Must buy credits to create paid licenses

### Order Tracking
- All payments are saved to the `orders` table
- Status is updated via webhook (NOWPayments IPN)
- Users can view their order history at `/orders`
- Status types: pending, waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired

### Manual Payment Confirmation
- If webhook doesn't update the order status, users can manually confirm
- Click "Confirm" button on the orders page
- This verifies the payment and adds credits to the account
- API endpoint: `/api/payments/confirm`

### Security Fix Applied
- Users without admin_id now only see their own licenses
- Previously they could see ALL 150+ licenses in the system
