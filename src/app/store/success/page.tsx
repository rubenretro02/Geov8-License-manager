'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ArrowRight, Coins, Key, Loader2, AlertCircle } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const paymentType = searchParams.get('type') || 'license'
  const creditsParam = searchParams.get('credits')
  const npPaymentId = searchParams.get('NP_id') // NOWPayments payment_id from redirect

  const creditsAdded = creditsParam ? parseInt(creditsParam) : 0
  const isCredits = paymentType === 'credits'

  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyPayment() {
      if (!npPaymentId) {
        // No payment ID from NOWPayments, try to verify anyway
        try {
          const res = await fetch('/api/payments/verify', { method: 'GET' })
          const data = await res.json()
          if (data.verified > 0) {
            setVerified(true)
          }
        } catch (e) {
          console.error('Verification error:', e)
        }
        setVerifying(false)
        return
      }

      try {
        // First, save the payment_id to the order
        const saveRes = await fetch('/api/payments/save-payment-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nowpaymentsOrderId: orderId,
            paymentId: npPaymentId
          }),
        })

        if (saveRes.ok) {
          console.log('Payment ID saved:', npPaymentId)
        }

        // Then verify all pending payments
        const verifyRes = await fetch('/api/payments/verify', { method: 'GET' })
        const verifyData = await verifyRes.json()

        if (verifyData.verified > 0) {
          setVerified(true)
        } else if (verifyData.statusUpdated > 0) {
          // Payment is processing
          setError('Payment is being processed. Please check back in a few minutes.')
        }
      } catch (e) {
        console.error('Error:', e)
        setError('Could not verify payment. Please try refreshing.')
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [npPaymentId, orderId])

  if (verifying) {
    return (
      <>
        <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h1>
        <p className="text-zinc-400">Please wait while we confirm your payment.</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Processing</h1>
        <p className="text-zinc-400 mb-6">{error}</p>
        <Link href="/orders">
          <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">
            Check Order Status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </>
    )
  }

  return (
    <>
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
        isCredits ? 'bg-amber-500/20' : 'bg-emerald-500/20'
      }`}>
        <CheckCircle className={`w-10 h-10 ${isCredits ? 'text-amber-400' : 'text-emerald-400'}`} />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">
        {verified
          ? (isCredits ? 'Credits Added!' : 'Payment Successful!')
          : 'Payment Received!'
        }
      </h1>

      <p className="text-zinc-400 mb-6">
        {verified
          ? (isCredits
              ? `${creditsAdded} credits have been added to your account.`
              : 'Thank you for your purchase. Your license is ready.'
            )
          : 'Your payment is being processed. Credits will be added shortly.'
        }
      </p>

      {orderId && (
        <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
          <p className="text-xs text-zinc-500 mb-1">Order ID</p>
          <p className="text-sm font-mono text-white break-all">{orderId.split('_').slice(0, 3).join('_')}...</p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {isCredits && (
          <>
            <div className="flex items-center gap-3 text-left p-3 bg-zinc-800/30 rounded-lg">
              <Coins className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white">{creditsAdded} Credits {verified ? 'Added' : 'Pending'}</p>
                <p className="text-xs text-zinc-500">
                  Use them to create licenses for your clients
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left p-3 bg-zinc-800/30 rounded-lg">
              <Key className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white">Create Licenses</p>
                <p className="text-xs text-zinc-500">
                  Go to Dashboard to create licenses
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-3">
        <Link href="/dashboard">
          <Button className={`w-full ${
            isCredits
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}>
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>

        {!verified && (
          <Link href="/orders">
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Check Order Status
            </Button>
          </Link>
        )}
      </div>
    </>
  )
}

function LoadingFallback() {
  return (
    <>
      <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
      <p className="text-zinc-400">Please wait...</p>
    </>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center">
          <Suspense fallback={<LoadingFallback />}>
            <SuccessContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
