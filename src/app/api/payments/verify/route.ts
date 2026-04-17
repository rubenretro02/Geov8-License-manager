import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || ''
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || ''
const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1'

// Generate Cryptomus signature
function generateSign(data: object): string {
  const jsonData = JSON.stringify(data)
  const base64Data = Buffer.from(jsonData).toString('base64')
  return crypto.createHash('md5').update(base64Data + CRYPTOMUS_API_KEY).digest('hex')
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

// Check payment status using Cryptomus API
async function checkPaymentStatus(uuid: string, orderId?: string): Promise<{
  status: string
  paid: boolean
  processing: boolean
  uuid?: string
  actuallyPaid?: string
  payerCurrency?: string
} | null> {
  if (!CRYPTOMUS_API_KEY || !CRYPTOMUS_MERCHANT_ID) {
    console.log('No API key or merchant_id - cannot verify')
    return null
  }

  try {
    console.log(`Checking payment status for uuid: ${uuid}, order_id: ${orderId}`)

    // Cryptomus payment info endpoint
    const requestData: Record<string, string> = {}
    if (uuid) {
      requestData.uuid = uuid
    }
    if (orderId) {
      requestData.order_id = orderId
    }

    const sign = generateSign(requestData)

    const response = await fetch(`${CRYPTOMUS_API_URL}/payment/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': CRYPTOMUS_MERCHANT_ID,
        'sign': sign,
      },
      body: JSON.stringify(requestData),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Cryptomus payment info response:', JSON.stringify(data, null, 2))

      if (data.state === 0 && data.result) {
        const result = data.result
        const status = result.status || 'unknown'

        // Paid statuses in Cryptomus
        const paidStatuses = ['paid', 'paid_over']
        const processingStatuses = ['process', 'check', 'confirm_check']

        return {
          status: status,
          paid: paidStatuses.includes(status),
          processing: processingStatuses.includes(status),
          uuid: result.uuid,
          actuallyPaid: result.payment_amount,
          payerCurrency: result.payer_currency,
        }
      }
    }

    console.log('Cryptomus payment info request failed')
    return null
  } catch (error) {
    console.error('Error checking payment status:', error)
    return null
  }
}

// Add credits to user
async function addCreditsToUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  credits: number,
  orderId: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }

  const newBalance = (profile.credits || 0) + credits

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    profile_id: userId,
    amount: credits,
    type: 'purchase',
    description: `Purchased ${credits} credits - Order ${orderId} (auto-verified)`,
    created_by: userId,
  })

  return { success: true, newBalance }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body

    const adminSupabase = getSupabaseAdmin()

    // Get the order
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id) // Security: only own orders
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Already finished
    if (order.status === 'finished') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Order already completed'
      })
    }

    // Use stored payment_id (Cryptomus uuid) or cryptomus_order_id
    const uuidToCheck = order.payment_id
    const orderIdToCheck = order.cryptomus_order_id

    if (!uuidToCheck && !orderIdToCheck) {
      return NextResponse.json({
        success: false,
        message: 'No payment ID available to verify'
      })
    }

    // Check payment status with Cryptomus
    const paymentStatus = await checkPaymentStatus(uuidToCheck, orderIdToCheck)

    if (paymentStatus && paymentStatus.paid) {
      // Payment confirmed! Update order and add credits
      await adminSupabase
        .from('orders')
        .update({
          status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      const creditResult = await addCreditsToUser(
        adminSupabase,
        order.user_id,
        order.credits,
        order.id
      )

      if (creditResult.success) {
        console.log(`Auto-verified order ${order.id}. Added ${order.credits} credits.`)
        return NextResponse.json({
          success: true,
          autoConfirmed: true,
          message: `Payment verified! ${order.credits} credits added.`,
          creditsAdded: order.credits,
          newBalance: creditResult.newBalance,
        })
      }
    }

    // If processing, update local status
    if (paymentStatus && paymentStatus.processing && order.status !== paymentStatus.status) {
      await adminSupabase
        .from('orders')
        .update({
          status: paymentStatus.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
    }

    // Map Cryptomus status to user-friendly message
    const statusMessages: Record<string, string> = {
      'process': 'Payment is being processed',
      'check': 'Payment is being verified',
      'confirm_check': 'Payment is being confirmed',
      'paid': 'Payment completed',
      'paid_over': 'Payment completed (overpaid)',
      'fail': 'Payment failed',
      'wrong_amount': 'Wrong amount received',
      'cancel': 'Payment cancelled',
    }

    // Return current status from Cryptomus
    return NextResponse.json({
      success: true,
      autoConfirmed: false,
      cryptomusStatus: paymentStatus?.status || 'unknown',
      processing: paymentStatus?.processing || false,
      message: paymentStatus?.status
        ? statusMessages[paymentStatus.status] || `Payment status: ${paymentStatus.status}`
        : 'Unable to check payment status',
    })
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Verify all pending orders for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = getSupabaseAdmin()

    // Get all pending orders for this user
    const { data: pendingOrders, error } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting', 'process', 'check', 'confirm_check', 'confirming'])
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        verified: 0,
        message: 'No pending orders to verify'
      })
    }

    // Check each pending order with Cryptomus
    let verifiedCount = 0
    let creditsAdded = 0
    let statusUpdated = 0
    const results: Array<{ orderId: string; status: string; verified: boolean; updated?: boolean }> = []

    for (const order of pendingOrders) {
      // Use the stored payment_id (Cryptomus uuid) or cryptomus_order_id
      const uuidToCheck = order.payment_id
      const orderIdToCheck = order.cryptomus_order_id

      if (!uuidToCheck && !orderIdToCheck) {
        results.push({ orderId: order.id, status: order.status, verified: false })
        continue
      }

      const paymentStatus = await checkPaymentStatus(uuidToCheck, orderIdToCheck)
      console.log(`Order ${order.id} - Cryptomus status: ${paymentStatus?.status}, paid: ${paymentStatus?.paid}, processing: ${paymentStatus?.processing}`)

      if (paymentStatus && paymentStatus.paid) {
        // Payment finished - Update order and add credits
        await adminSupabase
          .from('orders')
          .update({
            status: 'finished',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        // Add credits
        const creditResult = await addCreditsToUser(
          adminSupabase,
          order.user_id,
          order.credits,
          order.id
        )

        if (creditResult.success) {
          verifiedCount++
          creditsAdded += order.credits
          results.push({ orderId: order.id, status: 'finished', verified: true })
          console.log(`Auto-verified order ${order.id}. Added ${order.credits} credits.`)
        }
      } else if (paymentStatus && paymentStatus.processing) {
        // Update local status to match Cryptomus status
        const cryptomusStatus = paymentStatus.status

        if (order.status !== cryptomusStatus) {
          console.log(`Updating order ${order.id} status from ${order.status} to ${cryptomusStatus}`)
          await adminSupabase
            .from('orders')
            .update({
              status: cryptomusStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
          statusUpdated++
        }

        results.push({
          orderId: order.id,
          status: cryptomusStatus,
          verified: false,
          updated: order.status !== cryptomusStatus
        })
      } else {
        results.push({
          orderId: order.id,
          status: paymentStatus?.status || order.status,
          verified: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      verified: verifiedCount,
      creditsAdded,
      statusUpdated,
      totalPending: pendingOrders.length,
      results,
      message: verifiedCount > 0
        ? `Verified ${verifiedCount} payment(s)! ${creditsAdded} credits added.`
        : statusUpdated > 0
          ? `Updated ${statusUpdated} order status(es). Payments still processing.`
          : 'No payments to auto-verify at this time.',
    })
  } catch (error) {
    console.error('Verify all payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
