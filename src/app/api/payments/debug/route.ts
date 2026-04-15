import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = request.nextUrl.searchParams.get('invoiceId')
    const paymentId = request.nextUrl.searchParams.get('paymentId') || '5575196577'

    if (!invoiceId) {
      // Get recent orders if no invoiceId provided
      const { data: orders } = await supabase
        .from('orders')
        .select('id, payment_id, status, created_at, amount, credits, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Build the order_ids that would be searched
      const ordersWithBuiltIds = orders?.map(order => ({
        ...order,
        built_order_id: `credits_${order.user_id}_${order.credits}_${new Date(order.created_at).getTime()}`
      }))

      // Get list of payments from NOWPayments
      let nowpaymentsData: unknown = null
      let nowpaymentsError: unknown = null
      try {
        const res = await fetch(`${NOWPAYMENTS_API_URL}/payment/?limit=10&orderBy=created_at&sortBy=desc`, {
          headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
        })
        const rawData = await res.json()
        if (res.ok) {
          // Extract just order_id and payment_status for each payment
          const payments = rawData.data || rawData || []
          nowpaymentsData = Array.isArray(payments)
            ? payments.map((p: Record<string, unknown>) => ({
                payment_id: p.payment_id,
                order_id: p.order_id,
                payment_status: p.payment_status,
              }))
            : rawData
        } else {
          nowpaymentsError = { status: res.status, data: rawData }
        }
      } catch (e) {
        nowpaymentsError = String(e)
      }

      return NextResponse.json({
        message: 'Compare built_order_id with NOWPayments order_id',
        apiKeyFirst8: NOWPAYMENTS_API_KEY.substring(0, 8),
        orders: ordersWithBuiltIds,
        nowpaymentsPayments: nowpaymentsData,
        nowpaymentsError: nowpaymentsError
      })
    }

    const results: Record<string, unknown> = {
      invoiceId,
      paymentId,
      apiKeyConfigured: !!NOWPAYMENTS_API_KEY,
      apiKeyFirst8: NOWPAYMENTS_API_KEY.substring(0, 8),
    }

    // Test 0: Check API status (verify API is working)
    try {
      const statusResponse = await fetch(`${NOWPAYMENTS_API_URL}/status`, {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
      })
      results.apiStatus = statusResponse.status
      results.apiStatusData = await statusResponse.json()
    } catch (e) {
      results.apiStatusError = String(e)
    }

    // Test 1: Get list of payments (to see what payments exist)
    try {
      const listResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment/?limit=5&orderBy=created_at&sortBy=desc`, {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
      })
      results.listPaymentsStatus = listResponse.status
      if (listResponse.ok) {
        results.listPaymentsData = await listResponse.json()
      } else {
        results.listPaymentsError = await listResponse.text()
      }
    } catch (e) {
      results.listPaymentsError = String(e)
    }

    // Test 2: Try to get the specific payment by payment_id
    try {
      const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
      })
      results.specificPaymentStatus = paymentResponse.status
      if (paymentResponse.ok) {
        results.specificPaymentData = await paymentResponse.json()
      } else {
        results.specificPaymentError = await paymentResponse.text()
      }
    } catch (e) {
      results.specificPaymentError = String(e)
    }

    // Test 3: invoice endpoint
    try {
      const invoiceResponse = await fetch(`${NOWPAYMENTS_API_URL}/invoice/${invoiceId}`, {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
      })
      results.invoiceStatus = invoiceResponse.status
      if (invoiceResponse.ok) {
        results.invoiceData = await invoiceResponse.json()
      } else {
        results.invoiceError = await invoiceResponse.text()
      }
    } catch (e) {
      results.invoiceError = String(e)
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
