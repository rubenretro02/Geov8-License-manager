'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Bell, Wifi, MapPin, CheckCircle, XCircle, Loader2, Send } from 'lucide-react'
import type { License } from '@/lib/types'
import { updateLicenseAlerts } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface AlertSettingsDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AlertSettingsDialog({ license, open, onOpenChange }: AlertSettingsDialogProps) {
  const { lang } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    alert_enabled: license.alert_enabled || false,
    alert_ip: license.alert_ip ?? true,
    alert_gps: license.alert_gps ?? true,
    alert_on_fail: license.alert_on_fail ?? true,
    alert_on_success: license.alert_on_success ?? false,
  })

  const handleSave = async () => {
    setLoading(true)
    const result = await updateLicenseAlerts(license.license_key, settings)

    if (result.success) {
      toast.success(lang === 'es' ? 'Configuración guardada' : 'Settings saved')
      onOpenChange(false)
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(false)
  }

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            {lang === 'es' ? 'Configurar Alertas' : 'Alert Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* License Info */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">
              {lang === 'es' ? 'Licencia' : 'License'}
            </p>
            <code className="text-emerald-400 font-mono">{license.license_key}</code>
            <p className="text-sm text-zinc-400 mt-1">{license.customer_name || 'No name'}</p>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {lang === 'es' ? 'Activar Monitoreo' : 'Enable Monitoring'}
                </p>
                <p className="text-xs text-zinc-500">
                  {lang === 'es' ? 'Recibir alertas en Telegram' : 'Receive alerts on Telegram'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.alert_enabled}
              onCheckedChange={(v) => updateSetting('alert_enabled', v)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {settings.alert_enabled && (
            <>
              {/* Alert Types */}
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                  {lang === 'es' ? 'Tipos de Error' : 'Error Types'}
                </p>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-white">
                        {lang === 'es' ? 'Errores de IP' : 'IP Errors'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {lang === 'es' ? 'Ubicación por IP incorrecta' : 'Wrong IP location'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.alert_ip}
                    onCheckedChange={(v) => updateSetting('alert_ip', v)}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm text-white">
                        {lang === 'es' ? 'Errores de GPS' : 'GPS Errors'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {lang === 'es' ? 'Coordenadas GPS incorrectas' : 'Wrong GPS coordinates'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.alert_gps}
                    onCheckedChange={(v) => updateSetting('alert_gps', v)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              {/* Alert When */}
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                  {lang === 'es' ? 'Alertar Cuando' : 'Alert When'}
                </p>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm text-white">
                        {lang === 'es' ? 'Check Falla' : 'Check Fails'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {lang === 'es' ? 'Cuando la verificación falla' : 'When verification fails'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.alert_on_fail}
                    onCheckedChange={(v) => updateSetting('alert_on_fail', v)}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-white">
                        {lang === 'es' ? 'Check Exitoso' : 'Check Succeeds'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {lang === 'es' ? 'Cuando la verificación es exitosa' : 'When verification passes'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.alert_on_success}
                    onCheckedChange={(v) => updateSetting('alert_on_success', v)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                <p className="text-xs text-zinc-500 mb-2">
                  {lang === 'es' ? 'Resumen' : 'Summary'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {settings.alert_ip && (
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                      <Wifi className="w-3 h-3 mr-1" /> IP
                    </Badge>
                  )}
                  {settings.alert_gps && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                      <MapPin className="w-3 h-3 mr-1" /> GPS
                    </Badge>
                  )}
                  {settings.alert_on_fail && (
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      <XCircle className="w-3 h-3 mr-1" /> Fail
                    </Badge>
                  )}
                  {settings.alert_on_success && (
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Success
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                {lang === 'es' ? 'Guardar' : 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
