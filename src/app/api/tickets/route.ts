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

// GET - List tickets
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminSupabase = getSupabaseAdmin()

    let query = adminSupabase
      .from('tickets')
      .select(`
        *,
        replies:ticket_replies(count)
      `)
      .order('created_at', { ascending: false })

    // If not admin, only show own tickets
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      query = query.eq('user_id', user.id)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, subject, message, category, priority } = body

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, subject, and message are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminSupabase = getSupabaseAdmin()

    // Create ticket
    const ticketData = {
      user_id: user?.id || null,
      email: email,
      name: name || null,
      subject: subject,
      message: message,
      category: category || 'general',
      priority: priority || 'normal',
      status: 'open',
    }

    const { data: ticket, error } = await adminSupabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    // Generate ticket number for display
    const ticketNumber = `TKT-${ticket.id.slice(0, 8).toUpperCase()}`

    return NextResponse.json({
      success: true,
      ticket,
      ticketNumber,
      message: `Ticket created successfully. Your ticket number is ${ticketNumber}`
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
