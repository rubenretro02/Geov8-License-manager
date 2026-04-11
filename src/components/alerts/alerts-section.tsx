'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Profile, License } from '@/lib/types'
import { LicenseAlertsSummary as LicenseAlertsSummaryType } from '@/lib/actions/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Bell,
  BellRing,
  Wifi,
  MapPin,
  Settings,
  Search,
  X,
  ChevronRight,
  FileText,
  Clock,
  Shield,
  Filter
} from 'lucide-react'
import { AlertSettingsDialog } from '@/components/dashboard/alert-settings-dialog'
import { getLicensesWithAlertsSummary, getMonitoredLicenses } from '@/lib/actions/alerts'
import { updateLicenseAlerts } from '@/lib/actions/licenses'
import { toast } from 'sonner'
import { LicenseAlertsModal } from './license-alerts-modal'

interface AlertsSectionProps {
  profile: Profile
}

export function AlertsSection({ profile }: AlertsSectionProps) {
  const [licensesSummary, setLicensesSummary] = useState<LicenseAlertsSummaryType[]>([])
  const [monitoredLicenses, setMonitoredLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLicenses, setLoadingLicenses] = useState(true)
  const [activeTab, setActiveTab] = useState('licenses')

  // Search filter for licenses list
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'errors' | 'total'>('recent')

  // Alert settings dialog
  const [selectedLicenseForSettings, setSelectedLicenseForSettings] = useState<License | null>(null)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)

  // License alerts modal
  const [selectedLicenseForAlerts, setSelectedLicenseForAlerts] = useState<LicenseAlertsSummaryType | null>(null)
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)

  const loadLicensesSummary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLicensesWithAlertsSummary()
      setLicensesSummary(data)
    } catch (error) {
      console.error('Error loading licenses summary:', error)
    }
    setLoading(false)
  }, [])

  const loadMonitoredLicenses = useCallback(async () => {
    setLoadingLicenses(true)
    try {
      const data = await getMonitoredLicenses()
      setMonitoredLicenses(data)
    } catch (error) {
      console.error('Error loading monitored licenses:', error)
    }
    setLoadingLicenses(false)
  }, [])

  useEffect(() => {
    loadLicensesSummary()
    loadMonitoredLicenses()
    const interval = setInterval(() => {
      loadLicensesSummary()
      loadMonitoredLicenses()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadLicensesSummary, loadMonitoredLicenses])

  // Filter and sort licenses
  const filteredLicenses = useMemo(() => {
    let result = [...licensesSummary]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((license) => {
        const searchableText = [
          license.license_key || '',
          license.customer_name || '',
        ].join(' ').toLowerCase()
        return searchableText.includes(query)
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        if (!a.last_alert_at) return 1
        if (!b.last_alert_at) return -1
        return new Date(b.last_alert_at).getTime() - new Date(a.last_alert_at).getTime()
      } else if (sortBy === 'errors') {
        return b.failed_alerts - a.failed_alerts
      } else {
        return b.total_alerts - a.total_alerts
      }
    })

    return result
  }, [licensesSummary, searchQuery, sortBy])

  const handleToggleAlert = async (license: License, enabled: boolean) => {
    const result = await updateLicenseAlerts(license.license_key, {
      alert_enabled: enabled,
      alert_ip: license.alert_ip ?? true,
      alert_gps: license.alert_gps ?? true,
      alert_on_fail: license.alert_on_fail ?? true,
      alert_on_success: license.alert_on_success ?? false,
    })
    if (result.success) {
      toast.success(enabled ? 'Alertas activadas' : 'Alertas desactivadas')
      loadMonitoredLicenses()
    } else {
      toast.error(result.error || 'Error actualizando alertas')
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `hace ${diffDays}d`
    return date.toLocaleDateString()
  }

  // Calculate totals
  const totals = useMemo(() => {
    return licensesSummary.reduce(
      (acc, license) => ({
        total: acc.total + license.total_alerts,
        failed: acc.failed + license.failed_alerts,
        success: acc.success + license.success_alerts,
      }),
      { total: 0, failed: 0, success: 0 }
    )
  }, [licensesSummary])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Centro de Alertas</h1>
            <p className="text-zinc-400 text-sm">Monitorea tus licencias de forma organizada</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { loadLicensesSummary(); loadMonitoredLicenses(); }}
          disabled={loading}
          className="border-zinc-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totals.total}</p>
                <p className="text-xs text-zinc-500">Total Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{totals.failed}</p>
                <p className="text-xs text-zinc-500">Errores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{totals.success}</p>
                <p className="text-xs text-zinc-500">Exitosos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{licensesSummary.length}</p>
                <p className="text-xs text-zinc-500">Licencias con Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="licenses" className="data-[state=active]:bg-zinc-700">
            <FileText className="w-4 h-4 mr-2" />
            Alertas por Licencia
          </TabsTrigger>
          <TabsTrigger value="monitored" className="data-[state=active]:bg-zinc-700">
            <BellRing className="w-4 h-4 mr-2" />
            Monitoreadas ({monitoredLicenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Licenses with Alerts Tab */}
        <TabsContent value="licenses" className="space-y-4 mt-4">
          {/* Filters */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Buscar por nombre o clave de licencia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-zinc-400" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mas reciente</SelectItem>
                      <SelectItem value="errors">Mas errores</SelectItem>
                      <SelectItem value="total">Mas alertas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-500">
                Mostrando {filteredLicenses.length} de {licensesSummary.length} licencias
              </div>
            </CardContent>
          </Card>

          {/* Licenses List */}
          <div className="space-y-3">
            {loading && licensesSummary.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center text-zinc-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-zinc-600" />
                  Cargando licencias...
                </CardContent>
              </Card>
            ) : filteredLicenses.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center text-zinc-400">
                  {searchQuery ? (
                    <div>
                      <Search className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                      <p>No hay licencias que coincidan con tu busqueda</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="text-amber-400 mt-2"
                      >
                        Limpiar busqueda
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Bell className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                      <p>No hay alertas registradas todavia</p>
                      <p className="text-sm mt-1">Las alertas apareceran aqui cuando se generen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredLicenses.map((license) => (
                <Card
                  key={license.license_key}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedLicenseForAlerts(license)
                    setAlertsModalOpen(true)
                  }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Icon indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        license.failed_alerts > 0
                          ? 'bg-red-500/20'
                          : 'bg-emerald-500/20'
                      }`}>
                        {license.failed_alerts > 0 ? (
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>

                      {/* License info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-white truncate">
                            {license.customer_name || 'Sin nombre'}
                          </p>
                        </div>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {license.license_key.slice(0, 16)}...
                        </code>
                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>Ultima alerta: {formatTimeAgo(license.last_alert_at)}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              {license.failed_alerts} errores
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                              {license.success_alerts} ok
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {license.total_alerts} alertas totales
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Monitored Licenses Tab */}
        <TabsContent value="monitored" className="space-y-4 mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" />
                Licencias con Alertas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLicenses ? (
                <div className="py-8 text-center text-zinc-400">Cargando...</div>
              ) : monitoredLicenses.length === 0 ? (
                <div className="py-8 text-center text-zinc-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <p>No hay licencias con alertas activas</p>
                  <p className="text-sm mt-1">Activa alertas en una licencia para verla aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monitoredLicenses.map((license) => (
                    <div
                      key={license.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <Bell className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{license.customer_name || 'Sin nombre'}</p>
                          <code className="text-xs text-emerald-400">{license.license_key}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Alert types badges */}
                        <div className="flex gap-2">
                          {(license.alert_ip ?? true) && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              <Wifi className="w-3 h-3 mr-1" />
                              IP
                            </Badge>
                          )}
                          {(license.alert_gps ?? true) && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                          {(license.alert_on_fail ?? true) && (
                            <Badge className="bg-red-500/20 text-red-400 text-xs">
                              Error
                            </Badge>
                          )}
                          {license.alert_on_success && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Exito
                            </Badge>
                          )}
                        </div>
                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLicenseForSettings(license)
                            setAlertDialogOpen(true)
                          }}
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        {/* Toggle switch */}
                        <Switch
                          checked={license.alert_enabled || false}
                          onCheckedChange={(checked) => handleToggleAlert(license, checked)}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Settings Dialog */}
      {selectedLicenseForSettings && (
        <AlertSettingsDialog
          license={selectedLicenseForSettings}
          open={alertDialogOpen}
          onOpenChange={(open) => {
            setAlertDialogOpen(open)
            if (!open) {
              loadMonitoredLicenses()
            }
          }}
        />
      )}

      {/* License Alerts Modal */}
      <LicenseAlertsModal
        license={selectedLicenseForAlerts}
        open={alertsModalOpen}
        onOpenChange={setAlertsModalOpen}
      />
    </div>
  )
}
