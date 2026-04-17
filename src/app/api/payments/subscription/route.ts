import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || ''
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || ''
const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://geo.blackgoatt.com'

// Generate Cryptomus signature
function generateSign(data: object): string {
  const jsonData = JSON.stringify(data)
  const base64Data = Buffer.from(jsonData).toString('base64')
  return crypto.createHash('md5').update(base64Data + CRYPTOMUS_API_KEY).digest('hex')
}

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

    // Generate subscription order ID (without hyphens in userId for Cryptomus)
    const orderId = `sub_${user.id.replace(/-/g, '')}_${planId}_${Date.now()}`

    // Check if API key is configured
    if (!CRYPTOMUS_API_KEY || !CRYPTOMUS_MERCHANT_ID) {
      // Demo mode
      return NextResponse.json({
        success: true,
        message: 'Cryptomus API not configured. Demo mode.',
        orderId,
        planId,
        credits: plan.credits,
        paymentUrl: `/store/demo-subscription?order=${orderId}&plan=${planId}`,
      })
    }

    // Create recurring payment with Cryptomus
    const recurringData = {
      amount: plan.price.toString(),
      currency: 'USD',
      name: `GeoV8 ${plan.name} Plan`,
      period: 'monthly',
      order_id: orderId,
      url_callback: `${APP_URL}/api/payments/webhook`,
      url_return: `${APP_URL}/store`,
      url_success: `${APP_URL}/store/success?order=${orderId}&type=subscription`,
    }

    const sign = generateSign(recurringData)

    const response = await fetch(`${CRYPTOMUS_API_URL}/recurrence/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': CRYPTOMUS_MERCHANT_ID,
        'sign': sign,
      },
      body: JSON.stringify(recurringData),
    })

    const subResponse = await response.json()

    if (!response.ok || subResponse.state !== 0) {
      console.error('Cryptomus subscription error:', subResponse)

      // Fall back to single invoice if subscriptions not available
      const invoiceData = {
        amount: plan.price.toString(),
        currency: 'USD',
        order_id: orderId,
        url_callback: `${APP_URL}/api/payments/webhook`,
        url_return: `${APP_URL}/store`,
        url_success: `${APP_URL}/store/success?order=${orderId}&type=credits`,
        lifetime: 3600,
        additional_data: JSON.stringify({
          planName: `${plan.name} Plan`,
          credits: plan.credits,
          type: 'subscription_fallback',
        }),
      }

      const invoiceSign = generateSign(invoiceData)

      const invoiceResponse = await fetch(`${CRYPTOMUS_API_URL}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'merchant': CRYPTOMUS_MERCHANT_ID,
          'sign': invoiceSign,
        },
        body: JSON.stringify(invoiceData),
      })

      const invoiceResult = await invoiceResponse.json()

      if (!invoiceResponse.ok || invoiceResult.state !== 0) {
        return NextResponse.json({
          error: invoiceResult.message || 'Failed to create payment'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        orderId,
        paymentId: invoiceResult.result.uuid,
        paymentUrl: invoiceResult.result.url,
        type: 'invoice', // Single payment, not recurring
      })
    }

    const result = subResponse.result

    // Save subscription info to profile
    await supabase
      .from('profiles')
      .update({
        subscription_id: result.uuid,
        subscription_status: 'active',
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      orderId,
      subscriptionId: result.uuid,
      paymentUrl: result.url,
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
