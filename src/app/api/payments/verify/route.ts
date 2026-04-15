import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

// Check payment status using the invoice_id (payment_id in our database)
async function checkPaymentStatus(invoiceId: string): Promise<{
  status: string
  paid: boolean
  processing: boolean
  payment_id?: string
  actuallyPaid?: number
  payAmount?: number
} | null> {
  if (!NOWPAYMENTS_API_KEY || !invoiceId) {
    console.log('No API key or invoice_id - cannot verify')
    return null
  }

  try {
    console.log(`Checking payment status for invoice_id: ${invoiceId}`)

    // Try the invoice endpoint first
    const invoiceResponse = await fetch(`${NOWPAYMENTS_API_URL}/invoice/${invoiceId}`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
    })

    if (invoiceResponse.ok) {
      const data = await invoiceResponse.json()
      console.log('Invoice response:', JSON.stringify(data, null, 2))

      const finishedStatuses = ['finished', 'confirmed', 'sending']
      const processingStatuses = ['confirming', 'sending', 'partially_paid']
      const status = data.payment_status || data.status || 'unknown'

      return {
        status: status,
        paid: finishedStatuses.includes(status),
        processing: processingStatuses.includes(status),
        payment_id: data.payment_id?.toString(),
        actuallyPaid: data.actually_paid,
        payAmount: data.pay_amount,
      }
    }

    // If invoice endpoint fails, try with payment_id directly (for manual verification)
    const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment/${invoiceId}`, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
    })

    if (paymentResponse.ok) {
      const data = await paymentResponse.json()
      console.log('Payment response:', JSON.stringify(data, null, 2))

      const finishedStatuses = ['finished', 'confirmed', 'sending']
      const processingStatuses = ['confirming', 'sending', 'partially_paid']
      const status = data.payment_status || 'unknown'

      return {
        status: status,
        paid: finishedStatuses.includes(status),
        processing: processingStatuses.includes(status),
        payment_id: data.payment_id?.toString(),
        actuallyPaid: data.actually_paid,
        payAmount: data.pay_amount,
      }
    }

    console.log('Both invoice and payment endpoints failed')
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
    const { orderId, paymentId: manualPaymentId } = body

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

    // Use manual payment_id if provided, otherwise use the stored payment_id (invoice_id)
    const idToCheck = manualPaymentId || order.payment_id

    if (!idToCheck) {
      return NextResponse.json({
        success: false,
        message: 'No payment ID available to verify'
      })
    }

    // Check payment status
    const paymentStatus = await checkPaymentStatus(idToCheck)

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

    // Return current status from NOWPayments
    return NextResponse.json({
      success: true,
      autoConfirmed: false,
      nowpaymentsStatus: paymentStatus?.status || 'unknown',
      processing: paymentStatus?.processing || false,
      message: paymentStatus?.status === 'waiting' || paymentStatus?.status === 'pending'
        ? 'Payment not yet received'
        : paymentStatus?.processing
          ? `Payment is being processed (${paymentStatus.status})`
          : `Payment status: ${paymentStatus?.status || 'unknown'}`,
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
      .in('status', ['pending', 'waiting', 'confirming', 'confirmed', 'sending'])
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

    // Check each pending order with NOWPayments
    let verifiedCount = 0
    let creditsAdded = 0
    let statusUpdated = 0
    const results: Array<{ orderId: string; status: string; verified: boolean; updated?: boolean }> = []

    for (const order of pendingOrders) {
      // Use the stored payment_id (invoice_id) to check status
      if (!order.payment_id) {
        results.push({ orderId: order.id, status: order.status, verified: false })
        continue
      }

      const paymentStatus = await checkPaymentStatus(order.payment_id)
      console.log(`Order ${order.id} - NOWPayments status: ${paymentStatus?.status}, paid: ${paymentStatus?.paid}, processing: ${paymentStatus?.processing}`)

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
        // Update local status to match NOWPayments status
        const nowPaymentsStatus = paymentStatus.status

        if (order.status !== nowPaymentsStatus) {
          console.log(`Updating order ${order.id} status from ${order.status} to ${nowPaymentsStatus}`)
          await adminSupabase
            .from('orders')
            .update({
              status: nowPaymentsStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
          statusUpdated++
        }

        results.push({
          orderId: order.id,
          status: nowPaymentsStatus,
          verified: false,
          updated: order.status !== nowPaymentsStatus
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
