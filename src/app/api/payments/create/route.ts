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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, customerName, amount, planId, planName, credits, actualDays, type } = body

    if (!amount || !planId) {
      return NextResponse.json({ error: 'Amount and planId are required' }, { status: 400 })
    }

    // Determine if this is a credit purchase
    const isCredits = type === 'credits' || planId.startsWith('credits_') || planId.startsWith('custom_')
    const creditAmount = credits || (isCredits ? parseInt(planId.split('_')[1]) : 0)

    // CHECK FOR EXISTING PENDING ORDER (only within last 2 hours)
    // This prevents creating duplicate orders if user clicks multiple times
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('credits', creditAmount)
      .eq('amount', amount)
      .in('status', ['pending', 'waiting'])
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingOrder && existingOrder.payment_url) {
      // Return existing order's payment URL instead of creating a new one
      console.log(`Returning existing order ${existingOrder.id} for user ${user.id}`)
      return NextResponse.json({
        success: true,
        existingOrder: true,
        orderId: existingOrder.id,
        paymentId: existingOrder.payment_id,
        paymentUrl: existingOrder.payment_url,
        message: 'Using existing pending order',
      })
    }

    // Generate order ID with appropriate prefix
    // Cryptomus requires alphanumeric, underscores, and dashes only (no special chars)
    const timestamp = Date.now()
    const orderId = isCredits
      ? `credits_${user.id.replace(/-/g, '')}_${creditAmount}_${timestamp}`
      : `order_${user.id.replace(/-/g, '')}_${planId}_${timestamp}`

    // Save order to database first
    const orderData = {
      user_id: user.id,
      email: email || user.email,
      customer_name: customerName || null,
      amount: amount,
      credits: creditAmount,
      plan_id: planId,
      plan_name: planName || planId,
      type: isCredits ? 'credits' : 'license',
      status: 'pending',
      payment_id: null,
      payment_url: null,
      cryptomus_order_id: orderId, // Save the exact order_id sent to Cryptomus
    }

    const { data: orderRecord, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      // Continue anyway for demo mode
    }

    // Check if API key is configured
    if (!CRYPTOMUS_API_KEY || !CRYPTOMUS_MERCHANT_ID) {
      // Demo mode - update order with demo URL
      const demoUrl = isCredits
        ? `/store/demo-payment?order=${orderId}&credits=${creditAmount}`
        : `/store/demo-payment?order=${orderId}&plan=${planId}`

      if (orderRecord) {
        await supabase
          .from('orders')
          .update({
            payment_url: demoUrl,
            status: 'waiting'
          })
          .eq('id', orderRecord.id)
      }

      return NextResponse.json({
        success: true,
        message: 'Cryptomus API not configured. Demo mode.',
        orderId,
        paymentUrl: demoUrl,
      })
    }

    // Create Cryptomus payment data
    const paymentData = {
      amount: amount.toString(),
      currency: 'USD',
      order_id: orderId,
      url_return: `${APP_URL}/store`,
      url_success: `${APP_URL}/store/success?order=${orderId}&type=${isCredits ? 'credits' : 'license'}${isCredits ? `&credits=${creditAmount}` : ''}`,
      url_callback: `${APP_URL}/api/payments/webhook`,
      is_payment_multiple: false,
      lifetime: 3600, // 1 hour
      additional_data: JSON.stringify({
        customerName: customerName || email,
        planName: isCredits ? `${creditAmount} Credits` : planName,
        type: isCredits ? 'credits' : 'license',
      }),
    }

    const sign = generateSign(paymentData)

    const response = await fetch(`${CRYPTOMUS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': CRYPTOMUS_MERCHANT_ID,
        'sign': sign,
      },
      body: JSON.stringify(paymentData),
    })

    const paymentResponse = await response.json()

    if (!response.ok || paymentResponse.state !== 0) {
      console.error('Cryptomus error:', paymentResponse)

      // Update order with failed status
      if (orderRecord) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderRecord.id)
      }

      return NextResponse.json({
        error: paymentResponse.message || 'Failed to create payment'
      }, { status: 500 })
    }

    const result = paymentResponse.result

    // Update order with payment info
    if (orderRecord) {
      await supabase
        .from('orders')
        .update({
          payment_id: result.uuid,
          payment_url: result.url,
          status: 'waiting',
        })
        .eq('id', orderRecord.id)
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentId: result.uuid,
      paymentUrl: result.url,
    })
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
