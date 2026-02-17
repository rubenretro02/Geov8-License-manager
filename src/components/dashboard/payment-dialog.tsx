'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Loader2 } from 'lucide-react'
import type { License } from '@/lib/types'
import { markAsPaid } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface PaymentDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDialog({ license, open, onOpenChange }: PaymentDialogProps) {
  const { t, lang } = useLanguage()
  const [amount, setAmount] = useState('50')
  const [method, setMethod] = useState('paypal')
  const [loading, setLoading] = useState(false)

  const handleMarkPaid = async () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(lang === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount')
      return
    }

    setLoading(true)
    const result = await markAsPaid(license.license_key, amountNum, method)

    if (result.success) {
      toast.success(t('paymentRegistered'))
      onOpenChange(false)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            {t('registerPayment')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('markLicenseAsPaid')} <code className="text-emerald-400">{license.license_key}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('customer')}</Label>
            <p className="text-white font-medium">{license.customer_name || '-'}</p>
            {license.customer_email && (
              <p className="text-sm text-zinc-500">{license.customer_email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-zinc-300">{t('amount')} ($)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method" className="text-zinc-300">{t('paymentMethod')}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="paypal" className="text-white focus:bg-zinc-800">PayPal</SelectItem>
                <SelectItem value="zelle" className="text-white focus:bg-zinc-800">Zelle</SelectItem>
                <SelectItem value="crypto" className="text-white focus:bg-zinc-800">Crypto</SelectItem>
                <SelectItem value="cashapp" className="text-white focus:bg-zinc-800">Cash App</SelectItem>
                <SelectItem value="venmo" className="text-white focus:bg-zinc-800">Venmo</SelectItem>
                <SelectItem value="bank" className="text-white focus:bg-zinc-800">{lang === 'es' ? 'Transferencia Bancaria' : 'Bank Transfer'}</SelectItem>
                <SelectItem value="cash" className="text-white focus:bg-zinc-800">{lang === 'es' ? 'Efectivo' : 'Cash'}</SelectItem>
                <SelectItem value="other" className="text-white focus:bg-zinc-800">{lang === 'es' ? 'Otro' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleMarkPaid}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {lang === 'es' ? 'Guardando...' : 'Saving...'}
              </>
            ) : (
              t('registerPayment')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
