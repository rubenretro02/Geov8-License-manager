import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, credits, type } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Determine credit amount from orderId or body
    let creditAmount = credits
    if (!creditAmount && orderId.startsWith('credits_')) {
      // Format: credits_userId_creditAmount_timestamp
      const parts = orderId.split('_')
      creditAmount = parseInt(parts[2]) || 0
    }

    if (!creditAmount || creditAmount <= 0) {
      return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 })
    }

    // Add credits to profile
    const newBalance = (profile.credits || 0) + creditAmount

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      profile_id: user.id,
      amount: creditAmount,
      type: 'purchase',
      description: `Purchased ${creditAmount} credits - Demo Order ${orderId}`,
      created_by: user.id,
    })

    // Update order status to finished
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .eq('credits', creditAmount)
      .order('created_at', { ascending: false })
      .limit(1)

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError)
      // Don't fail the whole request just because order update failed
    }

    return NextResponse.json({
      success: true,
      type: 'credits',
      creditsAdded: creditAmount,
      newBalance,
    })
  } catch (error) {
    console.error('Demo payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
