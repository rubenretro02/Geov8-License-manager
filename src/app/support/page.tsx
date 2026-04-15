'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
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
  Shield,
  Mail,
  MessageCircle,
  HelpCircle,
  FileText,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  Loader2,
  Ticket,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Question' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'license', label: 'License Problem' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'account', label: 'Account Issue' },
  { value: 'other', label: 'Other' },
]

export default function SupportPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      if (user) {
        setForm(prev => ({ ...prev, email: user.email || '' }))
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        setTicketNumber(data.ticketNumber)
        toast.success('Ticket created successfully!')
      } else {
        toast.error(data.error || 'Failed to submit ticket')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Simple Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">GeoV8</h1>
              <p className="text-xs text-zinc-500">License Manager</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/tickets">
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    <Ticket className="w-4 h-4 mr-2" />
                    My Tickets
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Support Center</h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Need help? Our support team is here to assist you with any questions about GeoV8 License Manager.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form - Left Side */}
            <div className="lg:col-span-2">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Ticket Submitted!</h3>
                      <p className="text-zinc-400 mb-4">
                        Your ticket number is:
                      </p>
                      <code className="text-lg text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg">
                        {ticketNumber}
                      </code>
                      <p className="text-zinc-500 mt-4 text-sm">
                        We&apos;ll respond to your email within 24 hours.
                      </p>
                      {isLoggedIn && (
                        <Link href="/tickets">
                          <Button className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white">
                            <Ticket className="w-4 h-4 mr-2" />
                            View My Tickets
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4 ml-3 border-zinc-700 text-zinc-300"
                        onClick={() => {
                          setSubmitted(false)
                          setForm({ name: '', email: '', subject: '', message: '', category: 'general' })
                        }}
                      >
                        Submit Another
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-emerald-400" />
                        Contact Form
                      </h2>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name" className="text-zinc-300">Name</Label>
                            <Input
                              id="name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              placeholder="Your name"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-zinc-300">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              placeholder="your@email.com"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="subject" className="text-zinc-300">Subject</Label>
                            <Input
                              id="subject"
                              value={form.subject}
                              onChange={(e) => setForm({ ...form, subject: e.target.value })}
                              placeholder="Brief description"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="category" className="text-zinc-300">Category</Label>
                            <Select
                              value={form.category}
                              onValueChange={(value) => setForm({ ...form, category: value })}
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
                        </div>

                        <div>
                          <Label htmlFor="message" className="text-zinc-300">Message</Label>
                          <Textarea
                            id="message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Describe your issue in detail..."
                            className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[150px]"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Ticket
                            </>
                          )}
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Contact Info & Quick Links */}
            <div className="space-y-6">
              {/* Logged in user - Quick access */}
              {isLoggedIn && (
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="p-5">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-emerald-400" />
                      Quick Access
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      View and manage your support tickets in one place.
                    </p>
                    <Link href="/tickets">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                        View My Tickets
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Telegram Support */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Telegram</h3>
                      <p className="text-zinc-400 text-sm mb-3">
                        Get instant support via Telegram.
                      </p>
                      <a
                        href="https://t.me/geov8_support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                      >
                        @geov8_support
                        <Send className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Support */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
                      <p className="text-zinc-400 text-sm mb-3">
                        We&apos;ll respond within 24 hours.
                      </p>
                      <a
                        href="mailto:support@blackgoatt.com"
                        className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        support@blackgoatt.com
                        <Send className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Times */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    Response Times
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Telegram</span>
                      <span className="text-blue-400 font-medium">&lt; 1 hour</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Email/Tickets</span>
                      <span className="text-emerald-400 font-medium">&lt; 24 hours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Availability</span>
                      <span className="text-amber-400 font-medium">24/7</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-400" />
              Frequently Asked Questions
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">How do I purchase credits?</h4>
                  <p className="text-zinc-400 text-sm">
                    Go to the Store page and select a credit package. We accept cryptocurrency payments through our secure payment gateway.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">How long does payment confirmation take?</h4>
                  <p className="text-zinc-400 text-sm">
                    Cryptocurrency payments are usually confirmed within 10-30 minutes depending on network congestion.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">What if my payment is not confirmed?</h4>
                  <p className="text-zinc-400 text-sm">
                    Visit the Orders page and click &quot;Refresh &amp; Verify&quot;. If issues persist, contact support with your order ID.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">How do I create licenses?</h4>
                  <p className="text-zinc-400 text-sm">
                    Go to Dashboard and click &quot;Create License&quot;. Each license costs 1 credit.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/support" className="hover:text-white transition-colors text-emerald-400">
                Support
              </Link>
            </div>
            <p className="mt-4 text-zinc-600 text-sm">
              © 2024 GeoV8. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
