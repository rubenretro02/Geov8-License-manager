'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  HelpCircle,
  Loader2,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

interface Ticket {
  id: string
  email: string
  name: string | null
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  created_at: string
  updated_at: string
  replies: { count: number }[]
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

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Question' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'license', label: 'License Problem' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'account', label: 'Account Issue' },
  { value: 'other', label: 'Other' },
]

export default function TicketsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal',
  })

  const fetchTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets')
      const data = await response.json()

      if (data.tickets) {
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }, [])

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

      await fetchTickets()
      setLoading(false)
    }

    init()
  }, [router, fetchTickets])

  const refreshTickets = async () => {
    setRefreshing(true)
    await fetchTickets()
    setRefreshing(false)
    toast.success('Tickets refreshed')
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          name: profile?.full_name || profile?.username,
          ...newTicket,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Ticket created successfully!')
        setDialogOpen(false)
        setNewTicket({ subject: '', message: '', category: 'general', priority: 'normal' })
        await fetchTickets()
      } else {
        toast.error(data.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const getReplyCount = (ticket: Ticket) => {
    if (ticket.replies && ticket.replies.length > 0) {
      return ticket.replies[0].count || 0
    }
    return 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/support">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Support
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-emerald-400" />
                  My Tickets
                </h1>
                <p className="text-sm text-zinc-500">View and manage your support tickets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={refreshTickets}
                disabled={refreshing}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Support Ticket</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="subject" className="text-zinc-300">Subject</Label>
                      <Input
                        id="subject"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category" className="text-zinc-300">Category</Label>
                        <Select
                          value={newTicket.category}
                          onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-zinc-300">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority" className="text-zinc-300">Priority</Label>
                        <Select
                          value={newTicket.priority}
                          onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
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

                    <div>
                      <Label htmlFor="message" className="text-zinc-300">Message</Label>
                      <Textarea
                        id="message"
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                        placeholder="Describe your issue in detail..."
                        className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[150px]"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="border-zinc-700 text-zinc-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Ticket'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tickets Table */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No tickets yet</h3>
                  <p className="text-zinc-500 mb-6">Create a ticket to get help from our support team</p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400">Ticket</TableHead>
                        <TableHead className="text-zinc-400">Subject</TableHead>
                        <TableHead className="text-zinc-400">Category</TableHead>
                        <TableHead className="text-zinc-400">Priority</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400">Replies</TableHead>
                        <TableHead className="text-zinc-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => {
                        const statusConfig = STATUS_CONFIG[ticket.status]
                        const priorityConfig = PRIORITY_CONFIG[ticket.priority]
                        const StatusIcon = statusConfig.icon

                        return (
                          <TableRow key={ticket.id} className="border-zinc-800 hover:bg-zinc-800/50">
                            <TableCell>
                              <div>
                                <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  TKT-{ticket.id.slice(0, 8).toUpperCase()}
                                </code>
                                <div className="text-xs text-zinc-500 mt-1">
                                  {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium max-w-[200px] truncate">
                              {ticket.subject}
                            </TableCell>
                            <TableCell>
                              <span className="text-zinc-400 text-sm capitalize">
                                {ticket.category.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={priorityConfig.color}>
                                {priorityConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-zinc-400 text-sm flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {getReplyCount(ticket)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link href={`/tickets/${ticket.id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
