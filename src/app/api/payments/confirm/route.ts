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

// Convert userId back to UUID format (add hyphens)
function formatUserId(userId: string): string {
  if (userId.length === 32 && !userId.includes('-')) {
    return `${userId.slice(0, 8)}-${userId.slice(8, 12)}-${userId.slice(12, 16)}-${userId.slice(16, 20)}-${userId.slice(20)}`
  }
  return userId
}

// Parse order ID format: credits_userId_creditAmount_timestamp
function parseOrderId(orderId: string): { type: 'license' | 'credits'; userId: string; planId: string; credits?: number } | null {
  const parts = orderId.split('_')

  if (parts[0] === 'order' && parts.length >= 4) {
    return {
      type: 'license',
      userId: formatUserId(parts[1]),
      planId: parts[2],
    }
  } else if (parts[0] === 'credits' && parts.length >= 4) {
    return {
      type: 'credits',
      userId: formatUserId(parts[1]),
      planId: 'credits',
      credits: parseInt(parts[2]) || 0,
    }
  }

  return null
}

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
      .select('role')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    const { orderId, cryptomusOrderId } = body

    // If cryptomusOrderId provided (from Cryptomus), parse it
    const orderIdToParse = cryptomusOrderId || orderId

    if (!orderId && !cryptomusOrderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const adminSupabase = getSupabaseAdmin()

    // Find the order
    let order = null

    // First try to find by ID
    if (orderId) {
      const { data } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      order = data
    }

    // If not found and cryptomusOrderId provided, try to parse and find
    if (!order && cryptomusOrderId) {
      const parsed = parseOrderId(cryptomusOrderId)
      if (parsed) {
        // Find by user_id, credits, and status
        const { data } = await adminSupabase
          .from('orders')
          .select('*')
          .eq('user_id', parsed.userId)
          .eq('credits', parsed.credits || 0)
          .in('status', ['pending', 'waiting', 'process', 'check', 'confirm_check', 'confirming'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        order = data
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Security: ONLY super_admin can manually confirm orders (bypass Cryptomus verification)
    // Regular users must use /api/payments/verify which checks with Cryptomus
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({
        error: 'Only administrators can manually confirm payments. Use "Refresh & Verify" to check payment status with Cryptomus.'
      }, { status: 403 })
    }

    // Check if already finished
    if (order.status === 'finished') {
      return NextResponse.json({
        success: false,
        error: 'Order already completed',
        order
      })
    }

    // Update order status to finished
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Add credits to user's profile
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('credits')
      .eq('id', order.user_id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const newBalance = (userProfile.credits || 0) + order.credits

    const { error: creditError } = await adminSupabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', order.user_id)

    if (creditError) {
      console.error('Error adding credits:', creditError)
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }

    // Record transaction
    await adminSupabase.from('credit_transactions').insert({
      profile_id: order.user_id,
      amount: order.credits,
      type: 'purchase',
      description: `Purchased ${order.credits} credits - Order ${order.id} (manually confirmed)`,
      created_by: user.id,
    })

    console.log(`Manually confirmed order ${order.id}. Added ${order.credits} credits to user ${order.user_id}. New balance: ${newBalance}`)

    return NextResponse.json({
      success: true,
      message: `Payment confirmed! ${order.credits} credits added.`,
      creditsAdded: order.credits,
      newBalance,
      orderId: order.id,
    })
  } catch (error) {
    console.error('Confirm payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
