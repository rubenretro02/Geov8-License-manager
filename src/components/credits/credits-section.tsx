'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Coins,
  Plus,
  Minus,
  TrendingUp,
  Users,
  Clock,
  Settings,
  Loader2,
  FlaskConical
} from 'lucide-react'
import type { Profile, CreditTransaction } from '@/lib/types'
import { addCredits, setTrialLimit } from '@/lib/actions/credits'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface CreditsSectionProps {
  resellers: Profile[]
  transactions: CreditTransaction[]
  stats: {
    totalCredits: number
    totalTransactions: number
    creditsUsedThisMonth: number
  }
}

export function CreditsSection({ resellers, transactions, stats }: CreditsSectionProps) {
  const { t } = useLanguage()
  const [selectedReseller, setSelectedReseller] = useState<Profile | null>(null)
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [trialDialogOpen, setTrialDialogOpen] = useState(false)
  const [creditAmount, setCreditAmount] = useState('10')
  const [creditDescription, setCreditDescription] = useState('')
  const [trialLimit, setTrialLimitValue] = useState('20')
  const [loading, setLoading] = useState(false)

  const handleAddCredits = async (isDeduction: boolean = false) => {
    if (!selectedReseller) return

    const amount = parseInt(creditAmount) * (isDeduction ? -1 : 1)
    if (isNaN(amount) || amount === 0) {
      toast.error('Enter a valid amount')
      return
    }

    setLoading(true)
    const result = await addCredits(selectedReseller.id, amount, creditDescription || undefined)

    if (result.success) {
      toast.success(isDeduction ? 'Credits removed' : 'Credits added')
      setCreditDialogOpen(false)
      setCreditAmount('10')
      setCreditDescription('')
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(false)
  }

  const handleSetTrialLimit = async () => {
    if (!selectedReseller) return

    const limit = parseInt(trialLimit)
    if (isNaN(limit) || limit < 0) {
      toast.error('Enter a valid limit')
      return
    }

    setLoading(true)
    const result = await setTrialLimit(selectedReseller.id, limit)

    if (result.success) {
      toast.success('Trial limit updated')
      setTrialDialogOpen(false)
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(false)
  }

  const openCreditDialog = (reseller: Profile) => {
    setSelectedReseller(reseller)
    setCreditDialogOpen(true)
  }

  const openTrialDialog = (reseller: Profile) => {
    setSelectedReseller(reseller)
    setTrialLimitValue(reseller.trial_limit?.toString() || '20')
    setTrialDialogOpen(true)
  }

  const statCards = [
    {
      title: 'Total Credits in Circulation',
      value: stats.totalCredits,
      icon: Coins,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Credits Used This Month',
      value: stats.creditsUsedThisMonth,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Admins Activos',
      value: resellers.length,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ]

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge className="bg-emerald-500/20 text-emerald-400">Purchase</Badge>
      case 'license_30d':
        return <Badge className="bg-blue-500/20 text-blue-400">30-Day License</Badge>
      case 'license_permanent':
        return <Badge className="bg-violet-500/20 text-violet-400">Permanent</Badge>
      case 'adjustment':
        return <Badge className="bg-amber-500/20 text-amber-400">Ajuste</Badge>
      case 'refund':
        return <Badge className="bg-red-500/20 text-red-400">Reembolso</Badge>
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-400">{type}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Credits Management</h1>
        <p className="text-zinc-400 mt-1">Manage credits and trial limits for your admins</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resellers Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Admin</TableHead>
                <TableHead className="text-zinc-400">Credits</TableHead>
                <TableHead className="text-zinc-400">Trials Used</TableHead>
                <TableHead className="text-zinc-400">Trial Limit</TableHead>
                <TableHead className="text-zinc-400 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    No admins registered
                  </TableCell>
                </TableRow>
              ) : (
                resellers.map((reseller) => (
                  <TableRow key={reseller.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{reseller.full_name || reseller.username}</p>
                        <p className="text-xs text-zinc-500">{reseller.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500/20 text-amber-400 text-lg px-3">
                        {reseller.credits || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-white">
                        {reseller.trials_used_this_month || 0} / {reseller.trial_limit || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-500/20 text-purple-400">
                        {reseller.trial_limit || 0}/mes
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => openCreditDialog(reseller)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Coins className="h-4 w-4 mr-1" />
                          Credits
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTrialDialog(reseller)}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <FlaskConical className="h-4 w-4 mr-1" />
                          Trials
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Date</TableHead>
                <TableHead className="text-zinc-400">Type</TableHead>
                <TableHead className="text-zinc-400">Amount</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                    No transactions
                  </TableCell>
                </TableRow>
              ) : (
                transactions.slice(0, 10).map((tx) => (
                  <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-zinc-400 text-sm">
                      {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>{getTransactionBadge(tx.type)}</TableCell>
                    <TableCell>
                      <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {tx.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Credits Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Manage Credits
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedReseller?.full_name || selectedReseller?.username}
              <br />
              Current balance: <span className="text-amber-400 font-bold">{selectedReseller?.credits || 0} credits</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Amount of credits</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="1"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditAmount(amount.toString())}
                    className={`border-zinc-700 ${
                      creditAmount === amount.toString()
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Description (optional)</Label>
              <Input
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Ej: Pago PayPal #123"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleAddCredits(true)}
              disabled={loading}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Minus className="h-4 w-4 mr-1" />
              Remove
            </Button>
            <Button
              onClick={() => handleAddCredits(false)}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Limit Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-400" />
              Monthly Trial Limit
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedReseller?.full_name || selectedReseller?.username}
              <br />
              Trials used this month: <span className="text-purple-400 font-bold">
                {selectedReseller?.trials_used_this_month || 0}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Trial limit per month</Label>
              <Input
                type="number"
                value={trialLimit}
                onChange={(e) => setTrialLimitValue(e.target.value)}
                min="0"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-2 mt-2">
                {[0, 10, 20, 50, 100].map((limit) => (
                  <Button
                    key={limit}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTrialLimitValue(limit.toString())}
                    className={`border-zinc-700 ${
                      trialLimit === limit.toString()
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {limit === 0 ? 'No limit' : limit}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Trials reset automatically on the first day of each month.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTrialDialogOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetTrialLimit}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
