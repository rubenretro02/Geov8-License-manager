'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, User, Mail, Phone, MapPin, Lock } from 'lucide-react'
import type { License, Profile } from '@/lib/types'
import { updateLicense, updateLocationRules } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface EditLicenseDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
  profile?: Profile | null
}

export function EditLicenseDialog({ license, open, onOpenChange, profile }: EditLicenseDialogProps) {
  const { lang } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    phone_number: '',
  })
  // Location rules pushed to the desktop app (comma-separated in the UI)
  const [rules, setRules] = useState({
    allowed_countries: '',
    allowed_states: '',
    lock_location_settings: false,
  })

  // Only super_admin, the owning admin, or the creator may change the rules.
  // The server action enforces this too; the UI just hides it for everyone else.
  const canEditRules =
    !!profile && (
      profile.role === 'super_admin' ||
      (profile.role === 'admin' && license.admin_id === profile.id) ||
      license.created_by === profile.id
    )

  // Reset form when dialog opens with new license
  useEffect(() => {
    if (open && license) {
      setFormData({
        customer_name: license.customer_name || '',
        customer_email: license.customer_email || '',
        phone_number: license.phone_number || '',
      })
      setRules({
        allowed_countries: (license.allowed_countries || []).join(', '),
        allowed_states: (license.allowed_states || []).join(', '),
        lock_location_settings: !!license.lock_location_settings,
      })
    }
  }, [open, license])

  const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateLicense(license.license_key, {
        customer_name: formData.customer_name || null,
        customer_email: formData.customer_email || null,
        phone_number: formData.phone_number || null,
      })

      if (!result.success) {
        toast.error(result.error || (lang === 'es' ? 'Error al actualizar' : 'Failed to update'))
        return
      }

      if (canEditRules) {
        const rulesResult = await updateLocationRules(license.license_key, {
          allowed_countries: split(rules.allowed_countries),
          allowed_states: split(rules.allowed_states),
          lock_location_settings: rules.lock_location_settings,
        })
        if (!rulesResult.success) {
          toast.error(rulesResult.error || (lang === 'es' ? 'Error al guardar reglas de ubicación' : 'Failed to save location rules'))
          return
        }
      }

      toast.success(lang === 'es' ? 'Licencia actualizada' : 'License updated')
      onOpenChange(false)
    } catch (err) {
      toast.error(lang === 'es' ? 'Error al actualizar' : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {lang === 'es' ? 'Editar Licencia' : 'Edit License'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* License Key (read-only) */}
          <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">
              {lang === 'es' ? 'Licencia' : 'License'}
            </p>
            <code className="text-sm font-mono text-emerald-400">
              {license.license_key}
            </code>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <User className="h-4 w-4" />
              {lang === 'es' ? 'Nombre del Cliente' : 'Customer Name'}
            </Label>
            <Input
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder={lang === 'es' ? 'Nombre completo' : 'Full name'}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {lang === 'es' ? 'Email del Cliente' : 'Customer Email'}
            </Label>
            <Input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              placeholder="email@example.com"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {lang === 'es' ? 'Teléfono / WhatsApp' : 'Phone / WhatsApp'}
            </Label>
            <Input
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+1234567890"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">
              {lang === 'es'
                ? 'Incluye el código de país. Se usará para contacto por WhatsApp.'
                : 'Include country code. Will be used for WhatsApp contact.'}
            </p>
          </div>

          {/* Location rules pushed to the desktop app */}
          {canEditRules && (
            <div className="space-y-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                    {lang === 'es' ? 'Reglas de ubicación' : 'Location rules'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {lang === 'es'
                      ? 'Países / estados permitidos que usa la app. Vacío = sin restricción.'
                      : 'Allowed countries / states the app checks against. Empty = no restriction.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">
                  {lang === 'es' ? 'Países permitidos' : 'Allowed countries'}
                </Label>
                <Input
                  value={rules.allowed_countries}
                  onChange={(e) => setRules({ ...rules, allowed_countries: e.target.value })}
                  placeholder="United States, USA, US"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">
                  {lang === 'es' ? 'Estados permitidos' : 'Allowed states'}
                </Label>
                <Input
                  value={rules.allowed_states}
                  onChange={(e) => setRules({ ...rules, allowed_states: e.target.value })}
                  placeholder="Florida, Texas"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm text-white flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    {lang === 'es' ? 'Forzar desde el manager' : 'Enforce from manager'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {lang === 'es'
                      ? 'La app usa estas listas y el usuario no puede editarlas.'
                      : 'The app uses these lists and the user cannot edit them.'}
                  </p>
                </div>
                <Switch
                  checked={rules.lock_location_settings}
                  onCheckedChange={(checked) => setRules({ ...rules, lock_location_settings: checked })}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-zinc-400 hover:text-white"
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {lang === 'es' ? 'Guardar' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
