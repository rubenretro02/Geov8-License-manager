'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, Shield, Loader2, AlertTriangle, CheckCircle, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

// Credit plans for admins
const CREDIT_PLANS: Record<string, { credits: number; price: number; name: string; icon: React.ElementType }> = {
  starter: { credits: 100, price: 50, name: 'Starter', icon: Coins },
  pro: { credits: 300, price: 120, name: 'Pro', icon: Sparkles },
  enterprise: { credits: 1000, price: 350, name: 'Enterprise', icon: Crown },
}

function DemoSubscriptionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order')
  const planId = searchParams.get('plan') || 'starter'
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)

  const plan = CREDIT_PLANS[planId] || CREDIT_PLANS.starter
  const PlanIcon = plan.icon

  const simulatePayment = async () => {
    if (!orderId) {
      toast.error('No order ID found')
      return
    }

    setProcessing(true)

    try {
      // Simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Call demo-complete endpoint
      const response = await fetch('/api/payments/demo-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, planId }),
      })

      const data = await response.json()

      if (response.ok && data.type === 'credits') {
        setCompleted(true)
        toast.success(`${data.creditsAdded} credits added to your account!`)
        setTimeout(() => {
          router.push(`/store/success?order=${orderId}&type=credits&credits=${data.creditsAdded}`)
        }, 1500)
      } else {
        throw new Error(data.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment simulation failed')
    } finally {
      setProcessing(false)
    }
  }

  if (completed) {
    return (
      <Card className="max-w-md w-full bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Credits Added!</h2>
          <p className="text-zinc-400">Redirecting to confirmation...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full bg-zinc-900/50 border-zinc-800">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <CardTitle className="text-2xl text-white">Demo Payment Mode</CardTitle>
        <p className="text-zinc-400 text-sm mt-2">
          NOWPayments API key is not configured. This is a demo credit purchase simulation.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {orderId && (
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Order ID</p>
            <p className="text-sm font-mono text-white break-all">{orderId}</p>
          </div>
        )}

        <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <PlanIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{plan.name} Plan</p>
              <p className="text-xs text-zinc-500">{plan.credits} credits - ${plan.price}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-zinc-700">
            <Coins className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-zinc-400">
              Credits will be added to your account instantly. Use them to create licenses for your clients.
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-300 text-center">
            <strong>1 credit = 1 day</strong> of license validity
          </p>
        </div>

        <Button
          onClick={simulatePayment}
          disabled={processing || !orderId}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white py-6"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Simulate Payment (${plan.price})
            </>
          )}
        </Button>

        <Link href="/store?tab=credits" className="block">
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function LoadingFallback() {
  return (
    <Card className="max-w-md w-full bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        <p className="text-zinc-400 mt-4">Loading...</p>
      </CardContent>
    </Card>
  )
}

export default function DemoSubscriptionPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Toaster position="top-right" theme="dark" richColors />
      <Suspense fallback={<LoadingFallback />}>
        <DemoSubscriptionContent />
      </Suspense>
    </div>
  )
}
