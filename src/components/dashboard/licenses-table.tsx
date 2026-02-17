'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Copy,
  RefreshCw,
  Power,
  PowerOff,
  Trash2,
  DollarSign,
  Clock,
  Eye,
  Laptop,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import type { License } from '@/lib/types'
import { toggleLicenseStatus, resetHwid, deleteLicense, updateLicense } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { RenewDialog } from './renew-dialog'
import { PaymentDialog } from './payment-dialog'
import { LicenseDetailsDialog } from './license-details-dialog'
import { useLanguage } from '@/lib/language-context'

interface LicensesTableProps {
  licenses: License[]
}

export function LicensesTable({ licenses }: LicensesTableProps) {
  const { t } = useLanguage()
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('copiedToClipboard'))
  }

  const handleToggleStatus = async (license: License) => {
    const result = await toggleLicenseStatus(license.license_key, !license.is_active)
    if (result.success) {
      toast.success(license.is_active ? t('licenseDeactivated') : t('licenseActivated'))
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const handleResetHwid = async (license: License) => {
    const result = await resetHwid(license.license_key)
    if (result.success) {
      toast.success(t('hwidReset'))
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const handleDelete = async (license: License) => {
    if (!confirm(`${t('confirmDelete')} ${license.license_key}?`)) return

    const result = await deleteLicense(license.license_key)
    if (result.success) {
      toast.success(t('licenseDeleted'))
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const startEditing = (license: License) => {
    setEditingId(license.id)
    setEditName(license.customer_name || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (license: License) => {
    const result = await updateLicense(license.license_key, { customer_name: editName })
    if (result.success) {
      toast.success(t('nameUpdated'))
      setEditingId(null)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const getExpiryStatus = (license: License) => {
    if (!license.expires_at) return { label: t('permanent'), variant: 'default' as const }

    const expiry = new Date(license.expires_at)
    const now = new Date()
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return { label: t('expired'), variant: 'destructive' as const }
    if (daysLeft <= 3) return { label: `${daysLeft}d`, variant: 'destructive' as const }
    if (daysLeft <= 7) return { label: `${daysLeft}d`, variant: 'warning' as const }
    return { label: `${daysLeft}d`, variant: 'success' as const }
  }

  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-semibold">{t('license')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('customer')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('status')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('payment')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('expires')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('hwid')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  {t('noLicenses')}
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license) => {
                const expiryStatus = getExpiryStatus(license)
                const isEditing = editingId === license.id
                return (
                  <TableRow key={license.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          {license.license_key}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-white"
                          onClick={() => copyToClipboard(license.license_key)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 w-40 bg-zinc-800 border-zinc-700 text-white"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                            onClick={() => saveEdit(license)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-white">{license.customer_name || 'No name'}</p>
                            <p className="text-xs text-zinc-500">{license.customer_email || '-'}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-white"
                            onClick={() => startEditing(license)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {license.is_trial && (
                          <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                            {t('trialStatus')}
                          </Badge>
                        )}
                        <Badge
                          variant={license.is_active ? 'default' : 'destructive'}
                          className={license.is_active ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
                        >
                          {license.is_active ? t('activeStatus') : t('inactiveStatus')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={license.is_paid ? 'default' : 'secondary'}
                        className={
                          license.is_paid
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-zinc-700 text-zinc-400'
                        }
                      >
                        {license.is_paid ? `$${license.payment_amount}` : t('unpaidStatus')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={expiryStatus.variant === 'success' ? 'default' : expiryStatus.variant === 'warning' ? 'secondary' : expiryStatus.variant}
                        className={
                          expiryStatus.variant === 'success'
                            ? 'bg-blue-500/20 text-blue-400'
                            : expiryStatus.variant === 'warning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : expiryStatus.variant === 'destructive'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }
                      >
                        {expiryStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {license.hwid ? (
                        <div className="flex items-center gap-1.5">
                          <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs text-zinc-400 font-mono">
                            ...{license.hwid.slice(-6)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">{t('notActivated')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLicense(license)
                              setDetailsDialogOpen(true)
                            }}
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLicense(license)
                              setRenewDialogOpen(true)
                            }}
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {t('renew')}
                          </DropdownMenuItem>
                          {!license.is_paid && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedLicense(license)
                                setPaymentDialogOpen(true)
                              }}
                              className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {t('markAsPaid')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          {license.hwid && (
                            <DropdownMenuItem
                              onClick={() => handleResetHwid(license)}
                              className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              {t('resetHwid')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(license)}
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                          >
                            {license.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                {t('deactivate')}
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                {t('activate')}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(license)}
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLicense && (
        <>
          <RenewDialog
            license={selectedLicense}
            open={renewDialogOpen}
            onOpenChange={setRenewDialogOpen}
          />
          <PaymentDialog
            license={selectedLicense}
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
          />
          <LicenseDetailsDialog
            license={selectedLicense}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
        </>
      )}
    </>
  )
}
