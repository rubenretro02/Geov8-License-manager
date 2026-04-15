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
import { Loader2, Save, User, Mail, Phone } from 'lucide-react'
import type { License } from '@/lib/types'
import { updateLicense } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface EditLicenseDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditLicenseDialog({ license, open, onOpenChange }: EditLicenseDialogProps) {
  const { lang } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    phone_number: '',
  })

  // Reset form when dialog opens with new license
  useEffect(() => {
    if (open && license) {
      setFormData({
        customer_name: license.customer_name || '',
        customer_email: license.customer_email || '',
        phone_number: license.phone_number || '',
      })
    }
  }, [open, license])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateLicense(license.license_key, {
        customer_name: formData.customer_name || null,
        customer_email: formData.customer_email || null,
        phone_number: formData.phone_number || null,
      })

      if (result.success) {
        toast.success(lang === 'es' ? 'Licencia actualizada' : 'License updated')
        onOpenChange(false)
      } else {
        toast.error(result.error || (lang === 'es' ? 'Error al actualizar' : 'Failed to update'))
      }
    } catch (err) {
      toast.error(lang === 'es' ? 'Error al actualizar' : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
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
