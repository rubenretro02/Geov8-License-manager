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
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  Loader2,
  MapPin,
  Phone,
  Globe,
  Building,
  User,
  Ticket,
  BookOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

const CONTACT_REASONS = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'sales', label: 'Sales Question' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'enterprise', label: 'Enterprise Solutions' },
  { value: 'press', label: 'Press & Media' },
  { value: 'other', label: 'Other' },
]

export default function ContactPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    reason: 'general',
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
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `[${form.reason.toUpperCase()}] ${form.subject}`,
          message: form.company ? `Company: ${form.company}\n\n${form.message}` : form.message,
          category: form.reason,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        setTicketNumber(data.ticketNumber)
        toast.success('Message sent successfully!')
      } else {
        toast.error(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to send message')
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

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
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
            <Link href="/help">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <BookOpen className="w-4 h-4 mr-2" />
                Help Center
              </Button>
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Have a question or want to learn more about GeoV8? We'd love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact Form - Left Side */}
            <div className="lg:col-span-3">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                      <p className="text-zinc-400 mb-4">
                        Your reference number is:
                      </p>
                      <code className="text-lg text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg">
                        {ticketNumber}
                      </code>
                      <p className="text-zinc-500 mt-4 text-sm">
                        We&apos;ll get back to you within 24-48 hours.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6 border-zinc-700 text-zinc-300"
                        onClick={() => {
                          setSubmitted(false)
                          setForm({ name: '', email: '', company: '', subject: '', message: '', reason: 'general' })
                        }}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Send className="w-5 h-5 text-emerald-400" />
                        Send us a Message
                      </h2>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name" className="text-zinc-300">Full Name *</Label>
                            <Input
                              id="name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              placeholder="John Doe"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-zinc-300">Email Address *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              placeholder="john@example.com"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="company" className="text-zinc-300">Company (Optional)</Label>
                            <Input
                              id="company"
                              value={form.company}
                              onChange={(e) => setForm({ ...form, company: e.target.value })}
                              placeholder="Your company name"
                              className="bg-zinc-800 border-zinc-700 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="reason" className="text-zinc-300">Reason for Contact *</Label>
                            <Select
                              value={form.reason}
                              onValueChange={(value) => setForm({ ...form, reason: value })}
                            >
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                {CONTACT_REASONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="text-zinc-300">
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="subject" className="text-zinc-300">Subject *</Label>
                          <Input
                            id="subject"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            placeholder="What is this about?"
                            className="bg-zinc-800 border-zinc-700 text-white mt-1"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="message" className="text-zinc-300">Message *</Label>
                          <Textarea
                            id="message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Tell us more about your inquiry..."
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
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Contact */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    Get in Touch
                  </h3>

                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Email</h4>
                        <a
                          href="mailto:support@blackgoatt.com"
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          support@blackgoatt.com
                        </a>
                        <p className="text-zinc-500 text-sm mt-1">Response within 24 hours</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Telegram</h4>
                        <a
                          href="https://t.me/geov8_support"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          @geov8_support
                        </a>
                        <p className="text-zinc-500 text-sm mt-1">Fastest response time</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Business Hours</h4>
                        <p className="text-zinc-400">24/7 Online Support</p>
                        <p className="text-zinc-500 text-sm mt-1">We're always available</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support Options */}
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    Need Technical Support?
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    For technical issues with licenses, payments, or your account, please use our dedicated support portal.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link href="/support">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                        <Ticket className="w-4 h-4 mr-2" />
                        Open Support Ticket
                      </Button>
                    </Link>
                    <Link href="/help">
                      <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Help Center
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Social/Community */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Join Our Community</h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Stay updated with the latest news, features, and connect with other users.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="https://t.me/geov8_community"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Telegram
                      </Button>
                    </a>
                    <a
                      href="https://discord.gg/geov8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        <Globe className="w-4 h-4 mr-2" />
                        Discord
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Frequently Asked Questions</h2>
              <p className="text-zinc-400">Quick answers to common questions</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">How do I get started?</h4>
                  <p className="text-zinc-400 text-sm">
                    Create an account, purchase credits, and start creating licenses from your dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">What payment methods do you accept?</h4>
                  <p className="text-zinc-400 text-sm">
                    We accept cryptocurrency payments including BTC, ETH, LTC, and USDT via NOWPayments.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">Do you offer enterprise plans?</h4>
                  <p className="text-zinc-400 text-sm">
                    Yes! Contact us for custom enterprise solutions with dedicated support and features.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Link href="/help">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View All FAQs
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-16 pt-8 border-t border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/support" className="hover:text-white transition-colors">
                Support
              </Link>
              <span>•</span>
              <Link href="/help" className="hover:text-white transition-colors">
                Help Center
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
