'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Wifi, MapPin, CheckCircle, XCircle } from 'lucide-react'

interface AlertSettingsProps {
  enabled: boolean
  alertIp: boolean
  alertGps: boolean
  alertOnFail: boolean
  alertOnSuccess: boolean
  onChange: (settings: {
    alert_enabled: boolean
    alert_ip: boolean
    alert_gps: boolean
    alert_on_fail: boolean
    alert_on_success: boolean
  }) => void
}

export function AlertSettings({
  enabled,
  alertIp,
  alertGps,
  alertOnFail,
  alertOnSuccess,
  onChange,
}: AlertSettingsProps) {
  const updateSetting = (key: string, value: boolean) => {
    onChange({
      alert_enabled: key === 'alert_enabled' ? value : enabled,
      alert_ip: key === 'alert_ip' ? value : alertIp,
      alert_gps: key === 'alert_gps' ? value : alertGps,
      alert_on_fail: key === 'alert_on_fail' ? value : alertOnFail,
      alert_on_success: key === 'alert_on_success' ? value : alertOnSuccess,
    })
  }

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-zinc-300">
          <Bell className="w-4 h-4 text-amber-400" />
          Alert Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="alert-enabled" className="text-sm text-zinc-400">
              Enable Monitoring
            </Label>
          </div>
          <Switch
            id="alert-enabled"
            checked={enabled}
            onCheckedChange={(v) => updateSetting('alert_enabled', v)}
          />
        </div>

        {enabled && (
          <>
            <div className="border-t border-zinc-700 pt-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Alert Types</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <Label htmlFor="alert-ip" className="text-sm text-zinc-400">
                    IP Location errors
                  </Label>
                </div>
                <Switch
                  id="alert-ip"
                  checked={alertIp}
                  onCheckedChange={(v) => updateSetting('alert_ip', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <Label htmlFor="alert-gps" className="text-sm text-zinc-400">
                    GPS Coordinate errors
                  </Label>
                </div>
                <Switch
                  id="alert-gps"
                  checked={alertGps}
                  onCheckedChange={(v) => updateSetting('alert_gps', v)}
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Alert When</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <Label htmlFor="alert-fail" className="text-sm text-zinc-400">
                    Check fails
                  </Label>
                </div>
                <Switch
                  id="alert-fail"
                  checked={alertOnFail}
                  onCheckedChange={(v) => updateSetting('alert_on_fail', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <Label htmlFor="alert-success" className="text-sm text-zinc-400">
                    Check succeeds
                  </Label>
                </div>
                <Switch
                  id="alert-success"
                  checked={alertOnSuccess}
                  onCheckedChange={(v) => updateSetting('alert_on_success', v)}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
