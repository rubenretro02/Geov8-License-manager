'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Copy, Key, User, Calendar, Laptop, DollarSign, FileText, UserCircle } from 'lucide-react'
import type { License } from '@/lib/types'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface LicenseDetailsDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LicenseDetailsDialog({ license, open, onOpenChange }: LicenseDetailsDialogProps) {
  const { t, lang } = useLanguage()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('copiedToClipboard'))
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return format(new Date(date), 'PPP p', { locale: lang === 'es' ? es : enUS })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-400" />
            {t('viewDetails')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* License Key */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
            <div>
              <p className="text-xs text-zinc-500 mb-1">{t('license')}</p>
              <code className="text-lg font-mono text-emerald-400">{license.license_key}</code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(license.license_key)}
              className="text-zinc-400 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={license.is_active ? 'default' : 'destructive'}
              className={license.is_active ? 'bg-emerald-500/20 text-emerald-400' : ''}
            >
              {license.is_active ? t('activeStatus') : t('inactiveStatus')}
            </Badge>
            <Badge
              variant={license.is_paid ? 'default' : 'secondary'}
              className={license.is_paid ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}
            >
              {license.is_paid ? t('paidStatus') : t('unpaidStatus')}
            </Badge>
            {license.hwid && (
              <Badge className="bg-blue-500/20 text-blue-400">
                {t('notActivated').replace('Not activated', 'Activated').replace('No activada', 'Activada')}
              </Badge>
            )}
            {license.is_trial && (
              <Badge className="bg-purple-500/20 text-purple-400">
                {t('trial')}
              </Badge>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{t('customer')}</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-white">{license.customer_name || '-'}</p>
              <p className="text-sm text-zinc-500">{license.customer_email || '-'}</p>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{lang === 'es' ? 'Fechas' : 'Dates'}</span>
            </div>
            <div className="pl-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">{lang === 'es' ? 'Creada' : 'Created'}</p>
                <p className="text-sm text-white">{formatDate(license.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{lang === 'es' ? 'Activada' : 'Activated'}</p>
                <p className="text-sm text-white">{formatDate(license.activated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('expires')}</p>
                <p className="text-sm text-white">
                  {license.expires_at ? formatDate(license.expires_at) : t('permanent')}
                </p>
              </div>
            </div>
          </div>

          {/* Device Info */}
          {license.hwid && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Laptop className="h-4 w-4" />
                  <span className="text-sm font-medium">{lang === 'es' ? 'Dispositivo' : 'Device'}</span>
                </div>
                <div className="pl-6">
                  <p className="text-xs text-zinc-500">{t('hwid')}</p>
                  <code className="text-sm text-zinc-300 font-mono">{license.hwid}</code>
                </div>
              </div>
            </>
          )}

          {/* Payment Info */}
          {license.is_paid && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('payment')}</span>
                </div>
                <div className="pl-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">{t('amount')}</p>
                    <p className="text-sm text-green-400 font-semibold">${license.payment_amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{t('paymentMethod')}</p>
                    <p className="text-sm text-white capitalize">{license.payment_method || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{lang === 'es' ? 'Fecha de pago' : 'Payment date'}</p>
                    <p className="text-sm text-white">{formatDate(license.payment_date)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Created By */}
          {license.created_by_name && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <UserCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('createdBy')}</span>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-cyan-400 font-medium">{license.created_by_name}</p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {license.notes && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('notes')}</span>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-zinc-300">{license.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
