import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || ''

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Verify Cryptomus webhook signature
function verifySignature(body: Record<string, unknown>, receivedSign: string): boolean {
  if (!CRYPTOMUS_API_KEY) return true // Skip in demo mode

  // Remove sign from body before verification
  const dataWithoutSign = { ...body }
  delete dataWithoutSign.sign

  // Generate expected signature
  const jsonData = JSON.stringify(dataWithoutSign, (_, value) => {
    // Cryptomus uses escaped slashes in JSON
    if (typeof value === 'string') {
      return value.replace(/\//g, '\\/')
    }
    return value
  }).replace(/\//g, '\\/')

  const base64Data = Buffer.from(jsonData).toString('base64')
  const expectedSign = crypto.createHash('md5').update(base64Data + CRYPTOMUS_API_KEY).digest('hex')

  // Also try without escaped slashes (some versions may differ)
  const jsonDataSimple = JSON.stringify(dataWithoutSign)
  const base64DataSimple = Buffer.from(jsonDataSimple).toString('base64')
  const expectedSignSimple = crypto.createHash('md5').update(base64DataSimple + CRYPTOMUS_API_KEY).digest('hex')

  return expectedSign === receivedSign || expectedSignSimple === receivedSign
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
    // Note: userId has hyphens removed, so it's a continuous string
    return {
      type: 'license',
      userId: formatUserId(parts[1]),
      planId: parts[2],
    }
  } else if (parts[0] === 'credits' && parts.length >= 4) {
    // Format: credits_userId_creditAmount_timestamp
    return {
      type: 'credits',
      userId: formatUserId(parts[1]),
      planId: 'credits',
      credits: parseInt(parts[2]) || 0,
    }
  }

  return null
}

// Convert userId back to UUID format (add hyphens)
function formatUserId(userId: string): string {
  if (userId.length === 32 && !userId.includes('-')) {
    // It's a UUID without hyphens, add them back
    return `${userId.slice(0, 8)}-${userId.slice(8, 12)}-${userId.slice(12, 16)}-${userId.slice(16, 20)}-${userId.slice(20)}`
  }
  return userId
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

    // Update the order with new status and payment info from Cryptomus
    const updateData: Record<string, unknown> = {
      status: status,
      updated_at: new Date().toISOString(),
    }

    // Store payment details from Cryptomus
    if (paymentData?.uuid) {
      updateData.cryptomus_uuid = paymentData.uuid
      console.log(`Storing Cryptomus uuid: ${paymentData.uuid}`)
    }
    if (paymentData?.payer_currency) {
      updateData.pay_currency = paymentData.payer_currency
    }
    if (paymentData?.payment_amount) {
      updateData.actually_paid = paymentData.payment_amount
    }
    if (paymentData?.txid) {
      updateData.txid = paymentData.txid
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
  console.log(`handleCreditPayment called: userId=${userId}, credits=${credits}, orderId=${orderId}`)

  // First, check if this order was already processed (prevent duplicates)
  const orderInfo = parseOrderId(orderId)
  if (orderInfo) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('user_id', userId)
      .eq('credits', credits)
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingOrder) {
      console.log('Order already processed, skipping duplicate webhook')
      return { success: true, alreadyProcessed: true, message: 'Order already processed' }
    }
  }

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('Profile not found:', userId, profileError)
    return { success: false, error: 'Profile not found' }
  }

  console.log(`Current credits: ${profile.credits}`)

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

  console.log(`Credits updated successfully. New balance: ${newBalance}`)

  // Record transaction
  const { error: txError } = await supabase.from('credit_transactions').insert({
    profile_id: userId,
    amount: credits,
    type: 'purchase',
    description: `Purchased ${credits} credits - Order ${orderId}`,
    created_by: userId,
  })

  if (txError) {
    console.error('Failed to record transaction:', txError)
  } else {
    console.log('Transaction recorded successfully')
  }

  // Update order status to finished
  await updateOrderStatus(supabase, orderId, 'finished', { uuid: orderId })

  console.log(`SUCCESS: Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)
  return { success: true, creditsAdded: credits, newBalance }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('Cryptomus webhook received:', JSON.stringify(body, null, 2))

    // Get signature from body (Cryptomus includes it in the body)
    const receivedSign = body.sign

    // Verify signature
    if (!verifySignature(body, receivedSign)) {
      console.error('Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract payment data from Cryptomus webhook
    const {
      status,
      order_id,
      uuid,
      payer_currency,
      payment_amount,
      txid,
      is_final
    } = body

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

    // Map Cryptomus status to our status
    // Cryptomus statuses: confirm_check, paid, paid_over, fail, wrong_amount, cancel, system_fail, refund_process, refund_fail, refund_paid
    const statusMap: Record<string, string> = {
      'process': 'waiting',
      'check': 'confirming',
      'confirm_check': 'confirming',
      'paid': 'finished',
      'paid_over': 'finished',
      'fail': 'failed',
      'wrong_amount': 'failed',
      'cancel': 'cancelled',
      'system_fail': 'failed',
      'refund_process': 'refund_processing',
      'refund_fail': 'refund_failed',
      'refund_paid': 'refunded',
    }

    const mappedStatus = statusMap[status] || 'pending'

    // Update order status for all status changes
    await updateOrderStatus(supabase, order_id, mappedStatus, {
      uuid,
      payer_currency,
      payment_amount,
      txid,
    })

    // If payment is paid/paid_over, process credits
    // Note: is_final may be true, "true", or undefined - we accept all paid statuses
    const isPaid = status === 'paid' || status === 'paid_over'
    const isFinal = is_final === true || is_final === 'true' || is_final === undefined

    console.log(`Payment check: status=${status}, isPaid=${isPaid}, is_final=${is_final}, isFinal=${isFinal}`)

    if (isPaid && isFinal) {
      if (orderInfo.type === 'credits' && orderInfo.credits) {
        console.log(`Processing credit payment: userId=${orderInfo.userId}, credits=${orderInfo.credits}`)
        const result = await handleCreditPayment(
          supabase,
          orderInfo.userId,
          orderInfo.credits,
          order_id
        )
        console.log(`Credit payment result:`, result)
        return NextResponse.json({ ...result, type: 'credits' })
      } else {
        console.log(`Not a credit payment or no credits: type=${orderInfo.type}, credits=${orderInfo.credits}`)
      }
    } else {
      console.log(`Payment not ready for processing: isPaid=${isPaid}, isFinal=${isFinal}`)
    }

    return NextResponse.json({ success: true, status: mappedStatus })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({ message: 'Cryptomus webhook endpoint active' })
}
