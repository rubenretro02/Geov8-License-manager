'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HelpCircle,
  Loader2,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Shield,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

interface Ticket {
  id: string
  user_id: string
  email: string
  name: string | null
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface Reply {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_admin_reply: boolean
  created_at: string
  user: {
    username: string
    full_name: string | null
    role: string
  } | null
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: CheckCircle },
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  normal: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newReply, setNewReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const fetchTicket = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/${resolvedParams.id}`)
      const data = await response.json()

      if (data.ticket) {
        setTicket(data.ticket)
        setReplies(data.replies || [])
      } else {
        toast.error('Ticket not found')
        router.push('/tickets')
      }
    } catch (error) {
      console.error('Error fetching ticket:', error)
      toast.error('Failed to load ticket')
    }
  }, [resolvedParams.id, router])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      await fetchTicket()
      setLoading(false)
    }

    init()
  }, [router, fetchTicket])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTicket()
    setRefreshing(false)
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/tickets/${resolvedParams.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newReply }),
      })

      const data = await response.json()

      if (data.success) {
        setNewReply('')
        await fetchTicket()
        toast.success('Reply sent!')
      } else {
        toast.error(data.error || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/tickets/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        setTicket(data.ticket)
        toast.success(`Status updated to ${newStatus}`)
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const response = await fetch(`/api/tickets/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      const data = await response.json()

      if (data.success) {
        setTicket(data.ticket)
        toast.success(`Priority updated to ${newPriority}`)
      } else {
        toast.error(data.error || 'Failed to update priority')
      }
    } catch (error) {
      console.error('Error updating priority:', error)
      toast.error('Failed to update priority')
    }
  }

  if (loading || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading ticket...</p>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[ticket.status]
  const priorityConfig = PRIORITY_CONFIG[ticket.priority]
  const StatusIcon = statusConfig.icon
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/tickets">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  All Tickets
                </Button>
              </Link>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Ticket Info Card */}
          <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <code className="text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    TKT-{ticket.id.slice(0, 8).toUpperCase()}
                  </code>
                  <h1 className="text-2xl font-bold text-white mt-2">{ticket.subject}</h1>
                  <p className="text-zinc-500 text-sm mt-1">
                    Created {format(new Date(ticket.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                  <Badge className={priorityConfig.color}>
                    {priorityConfig.label}
                  </Badge>
                </div>
              </div>

              {/* Admin Controls */}
              {isAdmin && (
                <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Status:</span>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="open" className="text-zinc-300">Open</SelectItem>
                        <SelectItem value="in_progress" className="text-zinc-300">In Progress</SelectItem>
                        <SelectItem value="resolved" className="text-zinc-300">Resolved</SelectItem>
                        <SelectItem value="closed" className="text-zinc-300">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Priority:</span>
                    <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                      <SelectTrigger className="w-[120px] bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="low" className="text-zinc-300">Low</SelectItem>
                        <SelectItem value="normal" className="text-zinc-300">Normal</SelectItem>
                        <SelectItem value="high" className="text-zinc-300">High</SelectItem>
                        <SelectItem value="urgent" className="text-zinc-300">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                Conversation
              </h2>

              <div className="space-y-4">
                {/* Original Message */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{ticket.name || ticket.email}</p>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap">{ticket.message}</p>
                </div>

                {/* Replies */}
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-lg p-4 ${
                      reply.is_admin_reply
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        reply.is_admin_reply ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                      }`}>
                        {reply.is_admin_reply ? (
                          <Shield className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <User className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">
                            {reply.user?.full_name || reply.user?.username || 'User'}
                          </p>
                          {reply.is_admin_reply && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                              Support
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}

                {/* No replies message */}
                {replies.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <p>No replies yet. {isAdmin ? 'Be the first to respond!' : 'Our team will respond soon.'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reply Form */}
          {!isClosed ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <form onSubmit={handleSendReply}>
                  <Textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Type your reply..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[100px] mb-4"
                    required
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitting || !newReply.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-zinc-400">This ticket is {ticket.status}. No more replies can be added.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
