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
import { Clock, Loader2 } from 'lucide-react'
import type { License } from '@/lib/types'
import { renewLicense } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLanguage } from '@/lib/language-context'

interface RenewDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenewDialog({ license, open, onOpenChange }: RenewDialogProps) {
  const { t, lang } = useLanguage()
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(false)

  const handleRenew = async () => {
    const daysNum = parseInt(days)
    if (isNaN(daysNum) || daysNum <= 0) {
      toast.error(lang === 'es' ? 'Ingresa un número válido de días' : 'Enter a valid number of days')
      return
    }

    setLoading(true)
    const result = await renewLicense(license.license_key, daysNum)

    if (result.success) {
      toast.success(`${t('renewSuccess')} ${format(new Date(result.newExpiry!), 'PPP', { locale: lang === 'es' ? es : enUS })}`)
      onOpenChange(false)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  const quickOptions = [7, 15, 30, 60, 90, 365]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            {t('renewLicense')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('extendValidity')} <code className="text-emerald-400">{license.license_key}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('customer')}</Label>
            <p className="text-white font-medium">{license.customer_name || '-'}</p>
          </div>

          {license.expires_at && (
            <div className="space-y-2">
              <Label className="text-zinc-300">{t('currentExpiry')}</Label>
              <p className="text-white">{format(new Date(license.expires_at), 'PPP', { locale: lang === 'es' ? es : enUS })}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="days" className="text-zinc-300">{t('daysToAdd')}</Label>
            <Input
              id="days"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min="1"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {quickOptions.map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDays(d.toString())}
                className={`border-zinc-700 ${
                  days === d.toString()
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {d}d
              </Button>
            ))}
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
            onClick={handleRenew}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {lang === 'es' ? 'Renovando...' : 'Renewing...'}
              </>
            ) : (
              t('renew')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
