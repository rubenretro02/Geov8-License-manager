import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cryptomusOrderId, paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
    }

    const adminSupabase = getSupabaseAdmin()

    // Find the order by cryptomus_order_id or by user and recent status
    let order = null

    if (cryptomusOrderId) {
      // Try to find by the order_id pattern (e.g., credits_userId_amount_timestamp)
      const { data: orderByOrderId } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('cryptomus_order_id', cryptomusOrderId)
        .single()

      order = orderByOrderId
    }

    // If not found by cryptomus_order_id, find the most recent pending order
    if (!order) {
      const { data: recentOrder } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'waiting', 'process', 'check'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      order = recentOrder
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update the order with the payment_id from Cryptomus
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        payment_id: paymentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    console.log(`Saved payment_id ${paymentId} to order ${order.id}`)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: paymentId
    })
  } catch (error) {
    console.error('Save payment ID error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
