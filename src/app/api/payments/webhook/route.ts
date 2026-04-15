import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || ''

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function verifySignature(payload: string, signature: string): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) return true // Skip in demo mode

  const hash = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(payload)
    .digest('hex')

  return hash === signature
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = 4
  const segmentLength = 5
  const parts: string[] = []

  for (let i = 0; i < segments; i++) {
    let segment = ''
    for (let j = 0; j < segmentLength; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    parts.push(segment)
  }

  return parts.join('-')
}

// Parse order ID to get type, userId, and credits/planId
function parseOrderId(orderId: string): { type: 'license' | 'credits'; userId: string; planId: string; credits?: number } | null {
  const parts = orderId.split('_')

  if (parts[0] === 'order' && parts.length >= 4) {
    // Format: order_userId_planId_timestamp
    return {
      type: 'license',
      userId: parts[1],
      planId: parts[2],
    }
  } else if (parts[0] === 'credits' && parts.length >= 4) {
    // Format: credits_userId_creditAmount_timestamp
    return {
      type: 'credits',
      userId: parts[1],
      planId: 'credits',
      credits: parseInt(parts[2]) || 0,
    }
  }

  return null
}

// Update order status in database
async function updateOrderStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  status: string,
  paymentData?: Record<string, unknown>
) {
  try {
    const orderInfo = parseOrderId(orderId)
    if (!orderInfo) {
      console.error('Could not parse order_id:', orderId)
      return
    }

    console.log(`Looking for order: user=${orderInfo.userId}, credits=${orderInfo.credits}, type=${orderInfo.type}`)

    // Find the order by user_id and credits amount, with status not finished
    const { data: orders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', orderInfo.userId)
      .eq('credits', orderInfo.credits || 0)
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1)

    if (findError) {
      console.error('Error finding order:', findError)
      return
    }

    if (!orders || orders.length === 0) {
      console.error('Order not found for:', orderId)
      return
    }

    const order = orders[0]
    console.log(`Found order ${order.id}, updating status to ${status}`)

    // Update the order with new status and payment_id from NOWPayments
    const updateData: Record<string, unknown> = {
      status: status,
      updated_at: new Date().toISOString(),
    }

    // Store the real payment_id from NOWPayments (this is different from invoice_id)
    if (paymentData?.payment_id) {
      updateData.nowpayments_payment_id = paymentData.payment_id
      console.log(`Storing NOWPayments payment_id: ${paymentData.payment_id}`)
    }
    if (paymentData?.pay_currency) {
      updateData.pay_currency = paymentData.pay_currency
    }
    if (paymentData?.actually_paid) {
      updateData.actually_paid = paymentData.actually_paid
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order status:', updateError)
    } else {
      console.log(`Order ${order.id} updated successfully to status: ${status}`)
    }
  } catch (error) {
    console.error('Error in updateOrderStatus:', error)
  }
}

// Handle credit purchase
async function handleCreditPayment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  credits: number,
  orderId: string
) {
  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('Profile not found:', userId)
    return { success: false, error: 'Profile not found' }
  }

  // Add credits to profile
  const newBalance = (profile.credits || 0) + credits

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to update credits:', updateError)
    return { success: false, error: updateError.message }
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    profile_id: userId,
    amount: credits,
    type: 'purchase',
    description: `Purchased ${credits} credits - Order ${orderId}`,
    created_by: userId,
  })

  // Update order status to finished
  await updateOrderStatus(supabase, orderId, 'finished', { payment_id: orderId })

  console.log(`Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)
  return { success: true, creditsAdded: credits, newBalance }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-nowpayments-sig') || ''

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payment = JSON.parse(body)

    console.log('Payment webhook received:', payment)

    // Check payment status
    const { payment_status, order_id, payment_id, pay_currency, actually_paid } = payment

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Parse order ID to determine type
    const orderInfo = parseOrderId(order_id)

    if (!orderInfo) {
      console.error('Invalid order_id format:', order_id)
      return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Map NOWPayments status to our status
    const statusMap: Record<string, string> = {
      'waiting': 'waiting',
      'confirming': 'confirming',
      'confirmed': 'confirmed',
      'sending': 'sending',
      'partially_paid': 'partially_paid',
      'finished': 'finished',
      'failed': 'failed',
      'refunded': 'refunded',
      'expired': 'expired',
    }

    const mappedStatus = statusMap[payment_status] || 'pending'

    // Update order status for all status changes
    await updateOrderStatus(supabase, order_id, mappedStatus, {
      payment_id,
      pay_currency,
      actually_paid,
    })

    // If payment is confirmed/finished, process it
    if (payment_status === 'finished' || payment_status === 'confirmed') {
      if (orderInfo.type === 'credits' && orderInfo.credits) {
        const result = await handleCreditPayment(
          supabase,
          orderInfo.userId,
          orderInfo.credits,
          order_id
        )
        return NextResponse.json({ ...result, type: 'credits' })
      }
    }

    return NextResponse.json({ success: true, status: mappedStatus })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint active' })
}
