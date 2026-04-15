import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://geo.blackgott.com'

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
    const orderId = isCredits
      ? `credits_${user.id}_${creditAmount}_${Date.now()}`
      : `order_${user.id}_${planId}_${Date.now()}`

    // Create payment data
    const paymentData = {
      price_amount: amount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: isCredits
        ? `GeoV8 ${creditAmount} Credits for ${customerName || email}`
        : `GeoV8 ${planName} for ${customerName || email}`,
      ipn_callback_url: `${APP_URL}/api/payments/webhook`,
      success_url: `${APP_URL}/store/success?order=${orderId}&type=${isCredits ? 'credits' : 'license'}${isCredits ? `&credits=${creditAmount}` : ''}`,
      cancel_url: `${APP_URL}/store`,
    }

    // Save order to database first - include the exact order_id we send to NOWPayments
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
      nowpayments_order_id: orderId, // Save the exact order_id sent to NOWPayments
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
    if (!NOWPAYMENTS_API_KEY) {
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
        message: 'NOWPayments API key not configured. Demo mode.',
        orderId,
        paymentUrl: demoUrl,
      })
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })

    const paymentResponse = await response.json()

    if (!response.ok) {
      console.error('NOWPayments error:', paymentResponse)

      // Update order with failed status
      if (orderRecord) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderRecord.id)
      }

      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Update order with payment info
    if (orderRecord) {
      await supabase
        .from('orders')
        .update({
          payment_id: paymentResponse.id,
          payment_url: paymentResponse.invoice_url,
          status: 'waiting',
        })
        .eq('id', orderRecord.id)
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentId: paymentResponse.id,
      paymentUrl: paymentResponse.invoice_url,
    })
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
