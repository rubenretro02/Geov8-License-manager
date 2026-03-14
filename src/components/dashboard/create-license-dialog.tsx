'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, Copy, Check, Coins, FlaskConical, AlertCircle, Bell } from 'lucide-react'
import { AlertSettings } from './alert-settings'
import { createLicense } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'
import type { Profile } from '@/lib/types'

interface CreateLicenseDialogProps {
  profile?: Profile | null
}

export function CreateLicenseDialog({ profile }: CreateLicenseDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    days_valid: 30,
    is_paid: false,
    is_trial: false,
    payment_amount: 50,
    payment_method: 'paypal',
    notes: '',
    // Alert settings
    alert_enabled: false,
    alert_ip: true,
    alert_gps: true,
    alert_on_fail: true,
    alert_on_success: false,
  })

  // When trial is toggled, adjust days if needed
  const MAX_TRIAL_DAYS = 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await createLicense({
      ...formData,
      is_paid: formData.is_trial ? false : formData.is_paid,
    })

    if (result.success && result.licenseKey) {
      setCreatedKey(result.licenseKey)
      toast.success(t('licenseCreated'))
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success(t('copiedToClipboard'))
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      days_valid: 30,
      is_paid: false,
      is_trial: false,
      payment_amount: 50,
      payment_method: 'paypal',
      notes: '',
      alert_enabled: false,
      alert_ip: true,
      alert_gps: true,
      alert_on_fail: true,
      alert_on_success: false,
    })
    setCreatedKey(null)
    setCopied(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('newLicense')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{t('createLicense')}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('generateNewLicense')}
          </DialogDescription>

          {/* Credit/Trial Info for non-super_admin */}
          {profile && profile.role !== 'super_admin' && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-amber-500/20 text-amber-400 gap-1">
                <Coins className="h-3 w-3" />
                {profile.credits || 0} credits
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 gap-1">
                <FlaskConical className="h-3 w-3" />
                {(profile.trial_limit || 0) - (profile.trials_used_this_month || 0)} trials remaining
              </Badge>
            </div>
          )}
        </DialogHeader>

        {createdKey ? (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('licenseCreated')}</h3>
            </div>

            <div className="p-4 bg-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 mb-2">{t('license')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono text-emerald-400">{createdKey}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyKey}
                  className="text-zinc-400 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => handleOpenChange(false)}
              >
                {t('close')}
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={resetForm}
              >
                {t('createAnother')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">{t('customerName')}</Label>
                <Input
                  id="name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="john@email.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Trial Option - moved before days */}
            <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div>
                <p className="text-white font-medium">{t('isTrial')}</p>
                <p className="text-xs text-zinc-500">{t('freeTrialPeriod')} (max. 5 days)</p>
              </div>
              <Switch
                checked={formData.is_trial}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  is_trial: checked,
                  is_paid: checked ? false : formData.is_paid,
                  days_valid: checked ? Math.min(formData.days_valid || 5, 5) : formData.days_valid
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days" className="text-zinc-300">
                {t('daysValid')} {formData.is_trial ? '(max. 5 days)' : `(0 = ${t('permanent')})`}
              </Label>
              <Input
                id="days"
                type="number"
                value={formData.days_valid}
                onChange={(e) => {
                  let value = parseInt(e.target.value) || 0
                  if (formData.is_trial && value > 5) value = 5
                  setFormData({ ...formData, days_valid: value })
                }}
                min={formData.is_trial ? 1 : 0}
                max={formData.is_trial ? 5 : undefined}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-2 mt-2">
                {formData.is_trial ? (
                  // Trial days: 1-5
                  [1, 2, 3, 4, 5].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, days_valid: d })}
                      className={`border-zinc-700 ${
                        formData.days_valid === d
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {d}d
                    </Button>
                  ))
                ) : (
                  // Regular days: 7, 15, 30, etc.
                  [7, 15, 30, 60, 90, 365].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, days_valid: d })}
                      className={`border-zinc-700 ${
                        formData.days_valid === d
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {d}d
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Payment Option - Hidden if trial */}
            {!formData.is_trial && (
              <>
                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="text-white font-medium">{t('markAsPaidOnCreate')}</p>
                    <p className="text-xs text-zinc-500">{t('registerPaymentOnCreate')}</p>
                  </div>
                  <Switch
                    checked={formData.is_paid}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                  />
                </div>

                {formData.is_paid && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-xl">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-zinc-300">{t('amount')} ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.payment_amount}
                        onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="method" className="text-zinc-300">{t('paymentMethod')}</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="paypal" className="text-white focus:bg-zinc-800">PayPal</SelectItem>
                          <SelectItem value="zelle" className="text-white focus:bg-zinc-800">Zelle</SelectItem>
                          <SelectItem value="crypto" className="text-white focus:bg-zinc-800">Crypto</SelectItem>
                          <SelectItem value="cashapp" className="text-white focus:bg-zinc-800">Cash App</SelectItem>
                          <SelectItem value="other" className="text-white focus:bg-zinc-800">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-zinc-300">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>

            {/* Alert Settings */}
            <AlertSettings
              enabled={formData.alert_enabled}
              alertIp={formData.alert_ip}
              alertGps={formData.alert_gps}
              alertOnFail={formData.alert_on_fail}
              alertOnSuccess={formData.alert_on_success}
              onChange={(settings) => setFormData({ ...formData, ...settings })}
            />

            {/* Credit Cost Indicator */}
            {profile && profile.role !== 'super_admin' && (
              <div className={`flex items-center justify-between p-3 rounded-xl ${
                formData.is_trial
                  ? 'bg-purple-500/10 border border-purple-500/20'
                  : formData.days_valid === 0
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-emerald-500/10 border border-emerald-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {formData.is_trial ? (
                    <FlaskConical className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Coins className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-sm text-white">
                    {formData.is_trial
                      ? 'Trial License'
                      : formData.days_valid === 0
                        ? 'Permanent License'
                        : `${formData.days_valid}-Day License`}
                  </span>
                </div>
                <Badge className={
                  formData.is_trial
                    ? 'bg-purple-500/20 text-purple-400'
                    : formData.days_valid === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                }>
                  {formData.is_trial
                    ? 'Free'
                    : formData.days_valid === 0
                      ? '10 credits'
                      : `${(Math.round((formData.days_valid / 30) * 100) / 100).toFixed(2)} credits`}
                </Badge>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-zinc-400 hover:text-white"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  t('createLicense')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
