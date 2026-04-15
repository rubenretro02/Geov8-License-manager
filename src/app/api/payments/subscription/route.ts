import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://geo.blackgott.com'

// Subscription plans for admins (credits)
// 1 credit = 1 day of license
const CREDIT_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 100, // 100 credits/days
    price: 50,
    interval: 'month',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 300, // 300 credits/days
    price: 120,
    interval: 'month',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 1000, // 1000 credits/days
    price: 350,
    interval: 'month',
  },
}

export type CreditPlanType = keyof typeof CREDIT_PLANS

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins can buy credit subscriptions
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can purchase credit subscriptions' }, { status: 403 })
    }

    const body = await request.json()
    const { planId = 'starter' } = body

    const plan = CREDIT_PLANS[planId as CreditPlanType]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Generate subscription order ID
    const orderId = `sub_${user.id}_${planId}_${Date.now()}`

    // Check if API key is configured
    if (!NOWPAYMENTS_API_KEY) {
      // Demo mode
      return NextResponse.json({
        success: true,
        message: 'NOWPayments API key not configured. Demo mode.',
        orderId,
        planId,
        credits: plan.credits,
        paymentUrl: `/store/demo-subscription?order=${orderId}&plan=${planId}`,
      })
    }

    // Create recurring payment plan in NOWPayments
    const subscriptionData = {
      subscription_plan_id: `geov8_${planId}`, // Your plan ID in NOWPayments
      pay_currency: 'usd',
      order_id: orderId,
      customer_email: profile.email,
      ipn_callback_url: `${APP_URL}/api/payments/webhook`,
      success_url: `${APP_URL}/store/success?order=${orderId}&type=subscription`,
      cancel_url: `${APP_URL}/store?tab=credits`,
    }

    // Note: NOWPayments subscriptions work differently
    // You need to set up recurring payment plans in their dashboard first
    // Then use the /v1/subscriptions endpoint
    const response = await fetch(`${NOWPAYMENTS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    })

    const subResponse = await response.json()

    if (!response.ok) {
      console.error('NOWPayments subscription error:', subResponse)
      // Fall back to invoice if subscriptions not available
      const invoiceData = {
        price_amount: plan.price,
        price_currency: 'usd',
        order_id: orderId,
        order_description: `GeoV8 ${plan.name} Plan - ${plan.credits} Credits/Month`,
        ipn_callback_url: `${APP_URL}/api/payments/webhook`,
        success_url: `${APP_URL}/store/success?order=${orderId}&type=credits`,
        cancel_url: `${APP_URL}/store?tab=credits`,
      }

      const invoiceResponse = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
        method: 'POST',
        headers: {
          'x-api-key': NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      const invoiceResult = await invoiceResponse.json()

      if (!invoiceResponse.ok) {
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        orderId,
        paymentId: invoiceResult.id,
        paymentUrl: invoiceResult.invoice_url,
        type: 'invoice', // Single payment, not recurring
      })
    }

    // Save subscription info to profile
    await supabase
      .from('profiles')
      .update({
        subscription_id: subResponse.id,
        subscription_status: 'active',
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      orderId,
      subscriptionId: subResponse.id,
      paymentUrl: subResponse.payment_link || subResponse.invoice_url,
      type: 'subscription',
    })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get available credit plans
export async function GET() {
  return NextResponse.json({
    plans: Object.values(CREDIT_PLANS),
  })
}
