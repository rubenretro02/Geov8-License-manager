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

// GET - Get ticket details with replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = getSupabaseAdmin()

    // Get ticket
    const { data: ticket, error } = await adminSupabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get replies
    const { data: replies } = await adminSupabase
      .from('ticket_replies')
      .select(`
        *,
        user:profiles(username, full_name, role)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ ticket, replies: replies || [] })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update ticket (status, priority, admin notes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    const body = await request.json()
    const { status, priority, admin_notes } = body

    const adminSupabase = getSupabaseAdmin()

    // Check ticket ownership
    const { data: ticket } = await adminSupabase
      .from('tickets')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_by = user.id
        updateData.resolved_at = new Date().toISOString()
      }
    }

    if (isAdmin) {
      if (priority) updateData.priority = priority
      if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    }

    const { data: updated, error } = await adminSupabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ticket: updated })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add reply to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    const adminSupabase = getSupabaseAdmin()

    // Check ticket access
    const { data: ticket } = await adminSupabase
      .from('tickets')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create reply
    const { data: reply, error } = await adminSupabase
      .from('ticket_replies')
      .insert({
        ticket_id: id,
        user_id: user.id,
        message: message,
        is_admin_reply: isAdmin,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reply:', error)
      return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
    }

    // If admin replies and ticket was open, set to in_progress
    if (isAdmin && ticket.status === 'open') {
      await adminSupabase
        .from('tickets')
        .update({ status: 'in_progress' })
        .eq('id', id)
    }

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    console.error('Add reply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
