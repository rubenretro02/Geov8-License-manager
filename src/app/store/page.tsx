'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Shield,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Bitcoin,
  Zap,
  Lock,
  Star,
  AlertCircle,
  LogIn,
  ArrowRight,
  Coins,
  Crown,
  Clock,
  Infinity,
  Edit3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

// Credit packages based on the design
const CREDIT_PACKAGES = [
  {
    id: 'monthly',
    name: 'Monthly',
    credits: 30,
    price: 30,
    pricePerCredit: 1,
    icon: Clock,
    color: 'zinc',
    popular: false,
    description: 'Perfect for trying out',
    duration: '30 days',
    features: [
      'HWID Protected License',
      '30-Day Validity',
      'Real-time Telegram Alerts',
      'Geolocation Tracking',
      'Priority Support',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    credits: 200, // 365 days but only 200 credits (discount)
    price: 200,
    pricePerCredit: 0.55, // $200 / 365 days
    actualDays: 365,
    icon: Crown,
    color: 'emerald',
    popular: true,
    description: 'Save $160 per year',
    duration: '365 days',
    features: [
      'HWID Protected License',
      '365-Day Validity',
      'Real-time Telegram Alerts',
      'Geolocation Tracking',
      'Priority Support',
      'Save 44% vs Monthly',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    credits: 300,
    price: 300,
    pricePerCredit: 0,
    icon: Infinity,
    color: 'amber',
    popular: false,
    description: 'One-time payment',
    duration: 'Forever',
    features: [
      'HWID Protected License',
      'Never Expires',
      'Real-time Telegram Alerts',
      'Geolocation Tracking',
      'Priority Support',
      'Lifetime Updates',
    ],
  },
]

type PackageType = typeof CREDIT_PACKAGES[number]['id'] | 'custom'

function StoreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [processing, setProcessing] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('yearly')
  const [customCredits, setCustomCredits] = useState(100)
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')

  // Custom credit price ($1 per credit by default, or custom from profile)
  const creditPrice = profile?.credit_price && profile.credit_price > 0
    ? profile.credit_price
    : 1

  useEffect(() => {
    const packageParam = searchParams.get('plan') as PackageType
    if (packageParam && CREDIT_PACKAGES.find(p => p.id === packageParam)) {
      setSelectedPackage(packageParam)
    }

    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUser(user)
          setEmail(user.email || '')

          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
            setCustomerName(profileData.full_name || profileData.username || '')

            // Redirect users created by admin (admin_id !== their own id) to dashboard
            // Only self-registered users and admins can access the store
            // Self-registered: admin_id === id OR admin_id is null (legacy)
            const isSelfRegistered = !profileData.admin_id || profileData.admin_id === profileData.id
            if (profileData.role === 'user' && !isSelfRegistered) {
              router.push('/dashboard')
              return
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [searchParams, router])

  const currentPackage = CREDIT_PACKAGES.find(p => p.id === selectedPackage)

  // Calculate price and credits
  const getCheckoutInfo = () => {
    if (selectedPackage === 'custom') {
      return {
        credits: customCredits,
        price: Math.round(customCredits * creditPrice),
        name: `${customCredits} Credits`,
      }
    }
    if (currentPackage) {
      return {
        credits: currentPackage.credits,
        price: currentPackage.price,
        name: currentPackage.name,
        actualDays: (currentPackage as typeof CREDIT_PACKAGES[1]).actualDays,
      }
    }
    return { credits: 0, price: 0, name: '' }
  }

  const checkoutInfo = getCheckoutInfo()

  const handlePurchase = async () => {
    if (!email || !customerName) {
      toast.error('Please fill in your name and email')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          customerName,
          amount: checkoutInfo.price,
          planId: selectedPackage === 'custom' ? `custom_${customCredits}` : selectedPackage,
          planName: checkoutInfo.name,
          credits: checkoutInfo.credits,
          actualDays: checkoutInfo.actualDays,
          type: 'credits',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      if (data.paymentUrl) {
        // Show message if using existing order
        if (data.existingOrder) {
          toast.info('Ya tienes un pago pendiente. Redirigiendo...')
        }
        window.location.href = data.paymentUrl
      } else {
        toast.error('Failed to create payment link')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process payment')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">GeoV8</h1>
                <p className="text-xs text-zinc-500">License Store</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Flexible pricing options to fit your needs. All plans include full access to features.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all ${
                  pkg.popular ? 'border-emerald-500/50 scale-105' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Best Value
                    </span>
                  </div>
                )}

                <CardContent className="p-6 pt-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    pkg.color === 'amber' ? 'bg-amber-500/10' :
                    pkg.color === 'emerald' ? 'bg-emerald-500/10' :
                    'bg-zinc-500/10'
                  }`}>
                    <pkg.icon className={`w-6 h-6 ${
                      pkg.color === 'amber' ? 'text-amber-400' :
                      pkg.color === 'emerald' ? 'text-emerald-400' :
                      'text-zinc-400'
                    }`} />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{pkg.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">${pkg.price}</span>
                    <span className="text-zinc-500 ml-1">/{pkg.id === 'lifetime' ? 'forever' : pkg.id === 'yearly' ? 'year' : 'month'}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link href={`/login?redirect=/store?plan=${pkg.id}`}>
                    <Button
                      className={`w-full ${
                        pkg.popular
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : pkg.color === 'amber'
                            ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                            : 'border-zinc-700 text-white hover:bg-zinc-800'
                      }`}
                      variant={pkg.popular ? 'default' : 'outline'}
                    >
                      {pkg.id === 'lifetime' ? 'Get Lifetime Access' : 'Get Started'}
                      {pkg.popular && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-zinc-500">
            Secure payment via cryptocurrency (NOWPayments)
          </p>
        </main>
      </>
    )
  }

  // Logged in - show checkout
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">GeoV8</h1>
              <p className="text-xs text-zinc-500">License Store</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">{profile?.credits || 0} credits</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Instant Delivery
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Buy Credits
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Purchase credits to create and manage licenses. 1 credit = 1 day of license.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Plan Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Select Plan</h3>

              {CREDIT_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          pkg.color === 'amber' ? 'bg-amber-500/10' :
                          pkg.color === 'emerald' ? 'bg-emerald-500/10' :
                          'bg-zinc-500/10'
                        }`}>
                          <pkg.icon className={`w-6 h-6 ${
                            pkg.color === 'amber' ? 'text-amber-400' :
                            pkg.color === 'emerald' ? 'text-emerald-400' :
                            'text-zinc-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white">{pkg.name}</h4>
                            {pkg.popular && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 rounded text-xs text-emerald-400">
                                Best Value
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-400">{pkg.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">${pkg.price}</p>
                        <p className="text-xs text-zinc-500">{pkg.duration}</p>
                      </div>
                    </div>

                    {selectedPackage === pkg.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <ul className="grid grid-cols-2 gap-2">
                          {pkg.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Custom Amount Option */}
              <Card
                onClick={() => setSelectedPackage('custom')}
                className={`cursor-pointer transition-all ${
                  selectedPackage === 'custom'
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10">
                        <Edit3 className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Custom Amount</h4>
                        <p className="text-sm text-zinc-400">Choose your own credits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${customCredits * creditPrice}</p>
                      <p className="text-xs text-zinc-500">{customCredits} credits</p>
                    </div>
                  </div>

                  {selectedPackage === 'custom' && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <Label className="text-zinc-300 mb-2 block">Enter credits amount</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={customCredits}
                          onChange={(e) => setCustomCredits(Math.max(1, parseInt(e.target.value) || 1))}
                          min={1}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        ${creditPrice.toFixed(2)} per credit • 1 credit = 1 day of license
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Checkout Form */}
            <Card className="bg-zinc-900/50 border-zinc-800 h-fit sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Checkout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your name"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <p className="text-xs text-zinc-500">
                      Your license key will be sent to this email
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{checkoutInfo.name}</span>
                    <span className="text-white">{checkoutInfo.credits} credits</span>
                  </div>
                  {checkoutInfo.actualDays && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">License Duration</span>
                      <span className="text-emerald-400">{checkoutInfo.actualDays} days</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-700 pt-3 flex justify-between">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-bold text-white text-xl">${checkoutInfo.price}.00</span>
                  </div>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={processing || !email || !customerName}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 text-lg rounded-xl"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Bitcoin className="w-5 h-5 mr-2" />
                      Pay ${checkoutInfo.price} with Crypto
                    </>
                  )}
                </Button>

                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    By completing this purchase, you agree to our terms of service.
                    All sales are final. Credits will be added upon payment confirmation.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Lock className="w-3 h-3" />
                    Secure Payment
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Zap className="w-3 h-3" />
                    Instant Delivery
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Orders Link */}
          <div className="mt-8 text-center">
            <Link href="/orders">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                View Order History
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  )
}

export default function StorePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Toaster position="top-right" theme="dark" richColors />
      <Suspense fallback={<LoadingFallback />}>
        <StoreContent />
      </Suspense>
    </div>
  )
}
