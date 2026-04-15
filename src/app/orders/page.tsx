'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Receipt,
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Coins,
  ArrowLeft,
  ShoppingBag,
  CheckSquare,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, Order } from '@/lib/types'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  waiting: { label: 'Awaiting Payment', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  confirming: { label: 'Confirming', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: RefreshCw },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  sending: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw },
  partially_paid: { label: 'Partially Paid', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
  finished: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: RefreshCw },
  expired: { label: 'Expired', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: XCircle },
}

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tableError, setTableError] = useState(false)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [autoVerifying, setAutoVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    verified: number
    creditsAdded: number
  } | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // Redirect users created by admin (admin_id !== their own id) to dashboard
        const isSelfRegistered = !profileData.admin_id || profileData.admin_id === profileData.id
        if (profileData.role === 'user' && !isSelfRegistered) {
          router.push('/dashboard')
          return
        }
      }

      // Fetch orders
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setTableError(true)
        }
      } else {
        setOrders(ordersData || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  // Auto-verify payments with NOWPayments
  const autoVerifyPayments = useCallback(async () => {
    setAutoVerifying(true)
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'GET',
      })

      const data = await response.json()

      if (data.success && data.verified > 0) {
        setVerificationResult({
          verified: data.verified,
          creditsAdded: data.creditsAdded,
        })
        toast.success(`${data.verified} pago(s) verificado(s)! ${data.creditsAdded} créditos añadidos.`)
        // Refresh orders to show updated status
        await fetchOrders()
      }
    } catch (error) {
      console.error('Auto-verify error:', error)
    } finally {
      setAutoVerifying(false)
    }
  }, [fetchOrders])

  useEffect(() => {
    const init = async () => {
      await fetchOrders()
      // Auto-verify after fetching orders
      await autoVerifyPayments()
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshOrders = async () => {
    setRefreshing(true)
    setVerificationResult(null)
    await fetchOrders()
    await autoVerifyPayments()
    setRefreshing(false)
    toast.success('Orders refreshed & verified')
  }

  const confirmPayment = async (orderId: string) => {
    setConfirmingOrderId(orderId)
    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || `Payment confirmed! ${data.creditsAdded} credits added.`)
        await fetchOrders()
      } else {
        toast.error(data.error || 'Failed to confirm payment')
      }
    } catch (error) {
      console.error('Confirm payment error:', error)
      toast.error('Failed to confirm payment')
    } finally {
      setConfirmingOrderId(null)
    }
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }

  // Only super_admin can manually confirm orders without NOWPayments verification
  const canManuallyConfirmOrder = (order: Order) => {
    if (profile?.role !== 'super_admin') return false
    const confirmableStatuses = ['pending', 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid']
    return confirmableStatuses.includes(order.status)
  }

  // Check if order is still pending payment
  const isPendingPayment = (order: Order) => {
    const pendingStatuses = ['pending', 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid']
    return pendingStatuses.includes(order.status)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400">Cargando pedidos...</p>
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
              <Link href="/store">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Store
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Receipt className="w-6 h-6 text-emerald-400" />
                  Order History
                </h1>
                <p className="text-sm text-zinc-500">View all your purchases and payment status</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={refreshOrders}
              disabled={refreshing || autoVerifying}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing || autoVerifying ? 'animate-spin' : ''}`} />
              {autoVerifying ? 'Verifying...' : 'Refresh & Verify'}
            </Button>
          </div>

          {/* Auto-verification Status */}
          {autoVerifying && (
            <Card className="bg-emerald-500/10 border-emerald-500/20 mb-6">
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-medium">Verificando pagos automáticamente...</p>
                  <p className="text-emerald-400/70 text-sm">
                    Consultando NOWPayments para confirmar pagos pendientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verification Success */}
          {verificationResult && verificationResult.verified > 0 && (
            <Card className="bg-emerald-500/10 border-emerald-500/20 mb-6">
              <CardContent className="p-4 flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-medium">
                    ¡{verificationResult.verified} pago(s) verificado(s) automáticamente!
                  </p>
                  <p className="text-emerald-400/70 text-sm">
                    Se añadieron {verificationResult.creditsAdded} créditos a tu cuenta.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card for Pending Payments */}
          {orders.some(o => isPendingPayment(o)) && !autoVerifying && (
            <Card className="bg-blue-500/10 border-blue-500/20 mb-6">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium">¿El pago se completó pero no se verificó?</p>
                  <p className="text-blue-400/70 text-sm">
                    Los pagos se verifican automáticamente con NOWPayments. Haz clic en &quot;Refresh &amp; Verify&quot; para verificar el estado actual.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table Error State */}
          {tableError && (
            <Card className="bg-yellow-500/10 border-yellow-500/20 mb-6">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-yellow-400 font-medium">Orders table not configured</p>
                  <p className="text-yellow-400/70 text-sm">
                    Run the migration in <code className="bg-yellow-500/10 px-1 rounded">supabase_orders_migration.sql</code> to enable order tracking.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Table */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {orders.length === 0 && !tableError ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
                  <p className="text-zinc-500 mb-6">Your purchase history will appear here</p>
                  <Link href="/store">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                      <Coins className="w-4 h-4 mr-2" />
                      Buy Credits
                    </Button>
                  </Link>
                </div>
              ) : orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400">Plan</TableHead>
                        <TableHead className="text-zinc-400">Credits</TableHead>
                        <TableHead className="text-zinc-400">Amount</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => {
                        const statusConfig = getStatusConfig(order.status)
                        const StatusIcon = statusConfig.icon

                        return (
                          <TableRow key={order.id} className="border-zinc-800 hover:bg-zinc-800/50">
                            <TableCell className="text-zinc-300 text-sm">
                              <div>
                                <div>{format(new Date(order.created_at), 'MMM d, yyyy')}</div>
                                <div className="text-xs text-zinc-500">
                                  {format(new Date(order.created_at), 'HH:mm')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium">
                              {order.plan_name || order.plan_id}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <Coins className="w-3 h-3 mr-1" />
                                {order.credits}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                              ${order.amount}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {/* Manual Confirm Button - ONLY for super_admin */}
                                {canManuallyConfirmOrder(order) && (
                                  <Button
                                    size="sm"
                                    onClick={() => confirmPayment(order.id)}
                                    disabled={confirmingOrderId === order.id || autoVerifying}
                                    className="bg-red-600 hover:bg-red-500 text-white"
                                    title="Admin: Confirm without NOWPayments verification"
                                  >
                                    {confirmingOrderId === order.id ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <CheckSquare className="w-3 h-3 mr-1" />
                                    )}
                                    Admin Confirm
                                  </Button>
                                )}
                                {/* Pay Now Button - hide if already paid/confirming */}
                                {order.payment_url &&
                                 order.status !== 'finished' &&
                                 order.status !== 'expired' &&
                                 order.status !== 'failed' &&
                                 order.status !== 'confirming' &&
                                 order.status !== 'confirmed' &&
                                 order.status !== 'sending' && (
                                  <a href={order.payment_url} target="_blank" rel="noopener noreferrer">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Pay Now
                                    </Button>
                                  </a>
                                )}
                                {/* Show confirming status */}
                                {(order.status === 'confirming' || order.status === 'confirmed' || order.status === 'sending') && (
                                  <span className="text-purple-400 text-sm flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Confirming...
                                  </span>
                                )}
                                {order.status === 'finished' && (
                                  <span className="text-emerald-400 text-sm flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </span>
                                )}
                                {order.status === 'expired' && (
                                  <span className="text-zinc-500 text-sm">Expired</span>
                                )}
                                {order.status === 'failed' && (
                                  <Link href="/store">
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                      Try Again
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Status Legend */}
          {orders.length > 0 && (
            <div className="mt-8 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Payment Status Legend</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <config.icon className={`w-3 h-3 ${config.color.includes('emerald') ? 'text-emerald-400' : config.color.includes('yellow') ? 'text-yellow-400' : config.color.includes('blue') ? 'text-blue-400' : config.color.includes('red') ? 'text-red-400' : 'text-zinc-400'}`} />
                    <span className="text-zinc-400">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
