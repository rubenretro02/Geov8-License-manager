'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Shield,
  Key,
  Zap,
  Clock,
  CheckCircle,
  Lock,
  Globe,
  ChevronRight,
  Star,
  ArrowRight,
  Sparkles,
  Bot,
  MapPin,
  Bell,
  Crown,
  Infinity,
  LayoutDashboard,
  MessageCircle,
  Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)
      } catch {
        setIsLoggedIn(false)
      } finally {
        setChecking(false)
      }
    }
    checkAuth()
  }, [])
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
            {!checking && (
              isLoggedIn ? (
                <Link href="/dashboard">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Automated License Management System
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Protect Your
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                Software
              </span>
              {' '}With GeoV8
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Advanced license management with HWID binding, geolocation tracking,
              real-time alerts, and automated protection. Start protecting your software today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/store">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25 group">
                  View Plans
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 px-8 py-6 text-lg rounded-xl">
                  {isLoggedIn ? (
                    <>
                      <LayoutDashboard className="w-5 h-5 mr-2" />
                      Go to Dashboard
                    </>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Instant Activation
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                HWID Protected
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                Secure Payment
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Comprehensive license management with powerful features to protect and monitor your software
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Feature Cards */}
            <FeatureCard
              icon={Key}
              title="HWID Binding"
              description="Bind licenses to unique hardware IDs for maximum security and prevent unauthorized sharing"
            />
            <FeatureCard
              icon={MapPin}
              title="Geolocation Tracking"
              description="Track license usage by location with IP and GPS-based geolocation data"
            />
            <FeatureCard
              icon={Bell}
              title="Real-time Alerts"
              description="Get instant Telegram notifications for license activations and suspicious activities"
            />
            <FeatureCard
              icon={Clock}
              title="Expiration Control"
              description="Set custom expiration dates or create permanent licenses based on your needs"
            />
            <FeatureCard
              icon={Bot}
              title="Auto Protection"
              description="Automated license validation and protection built into your software"
            />
            <FeatureCard
              icon={Globe}
              title="Country Restrictions"
              description="Restrict license usage to specific countries or regions for compliance"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 relative bg-zinc-900/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Flexible pricing options to fit your needs. All plans include full access to features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Monthly Plan */}
            <Card className="bg-zinc-900/80 border-zinc-800 relative overflow-hidden backdrop-blur-sm hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-emerald-400" />
                </div>
                <CardTitle className="text-xl text-white">Monthly</CardTitle>
                <p className="text-zinc-400 text-sm">Perfect for trying out</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$30</span>
                  <span className="text-zinc-500">/month</span>
                </div>

                <ul className="space-y-3">
                  {[
                    'HWID Protected License',
                    '30-Day Validity',
                    'Real-time Telegram Alerts',
                    'Geolocation Tracking',
                    'Priority Support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-zinc-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/store?plan=monthly" className="block">
                  <Button variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800 py-5">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Yearly Plan - Popular */}
            <Card className="bg-zinc-900/80 border-emerald-500/50 relative overflow-hidden backdrop-blur-sm scale-105 shadow-xl shadow-emerald-500/10">
              {/* Popular Badge */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
                  <Star className="w-3 h-3 fill-current" />
                  Best Value
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-emerald-400" />
                </div>
                <CardTitle className="text-xl text-white">Yearly</CardTitle>
                <p className="text-zinc-400 text-sm">Save $160 per year</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$200</span>
                  <span className="text-zinc-500">/year</span>
                </div>

                <ul className="space-y-3">
                  {[
                    'HWID Protected License',
                    '365-Day Validity',
                    'Real-time Telegram Alerts',
                    'Geolocation Tracking',
                    'Priority Support',
                    'Save 44% vs Monthly',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-zinc-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/store?plan=yearly" className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Permanent Plan */}
            <Card className="bg-zinc-900/80 border-zinc-800 relative overflow-hidden backdrop-blur-sm hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Infinity className="w-6 h-6 text-amber-400" />
                </div>
                <CardTitle className="text-xl text-white">Lifetime</CardTitle>
                <p className="text-zinc-400 text-sm">One-time payment</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$300</span>
                  <span className="text-zinc-500">forever</span>
                </div>

                <ul className="space-y-3">
                  {[
                    'HWID Protected License',
                    'Never Expires',
                    'Real-time Telegram Alerts',
                    'Geolocation Tracking',
                    'Priority Support',
                    'Lifetime Updates',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-zinc-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/store?plan=lifetime" className="block">
                  <Button variant="outline" className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-5">
                    Get Lifetime Access
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-8">
            Secure payment via cryptocurrency (NOWPayments)
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Get your license in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create Account"
              description="Sign up for free and access your personal dashboard"
            />
            <StepCard
              number="2"
              title="Purchase License"
              description="Pay securely with cryptocurrency via NOWPayments"
            />
            <StepCard
              number="3"
              title="Activate & Use"
              description="Download the app and activate your license with your HWID"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">GeoV8</h3>
                  <p className="text-xs text-zinc-500">License Manager</p>
                </div>
              </Link>
              <p className="text-zinc-500 text-sm">
                Advanced license management with HWID binding and real-time protection.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/store" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Support Tickets
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <a href="https://t.me/geov8_support" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Telegram
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-zinc-400 hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              © 2024 GeoV8. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://t.me/geov8_support" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="mailto:support@blackgoatt.com" className="text-zinc-500 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
          <Icon className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description }: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
        <span className="text-2xl font-bold text-emerald-400">{number}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  )
}
