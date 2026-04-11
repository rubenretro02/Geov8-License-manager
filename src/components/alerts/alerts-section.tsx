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
  Filter,
  ArrowLeftRight
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

  // Filter by alert type (from stat cards)
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | 'errors' | 'ip_changes' | 'success'>('all')

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

    // Apply alert type filter (from stat cards)
    if (alertTypeFilter === 'errors') {
      result = result.filter((license) => license.failed_alerts > 0)
    } else if (alertTypeFilter === 'ip_changes') {
      result = result.filter((license) => (license.ip_change_alerts || 0) > 0)
    } else if (alertTypeFilter === 'success') {
      result = result.filter((license) => license.success_alerts > 0 && license.failed_alerts === 0 && (license.ip_change_alerts || 0) === 0)
    }

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
  }, [licensesSummary, searchQuery, sortBy, alertTypeFilter])

  const handleToggleAlert = async (license: License, enabled: boolean) => {
    const result = await updateLicenseAlerts(license.license_key, {
      alert_enabled: enabled,
      alert_ip: license.alert_ip ?? true,
      alert_gps: license.alert_gps ?? true,
      alert_on_fail: license.alert_on_fail ?? true,
      alert_on_success: license.alert_on_success ?? false,
    })
    if (result.success) {
      toast.success(enabled ? 'Alerts enabled' : 'Alerts disabled')
      loadMonitoredLicenses()
    } else {
      toast.error(result.error || 'Error updating alerts')
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Calculate totals
  const totals = useMemo(() => {
    return licensesSummary.reduce(
      (acc, license) => ({
        total: acc.total + license.total_alerts,
        failed: acc.failed + license.failed_alerts,
        success: acc.success + license.success_alerts,
        ipChanges: acc.ipChanges + (license.ip_change_alerts || 0),
      }),
      { total: 0, failed: 0, success: 0, ipChanges: 0 }
    )
  }, [licensesSummary])

  // Determine icon based on alert types
  const getLicenseIcon = (license: LicenseAlertsSummaryType) => {
    if (license.failed_alerts > 0) {
      return { bg: 'bg-red-500/20', icon: <AlertTriangle className="w-6 h-6 text-red-400" /> }
    }
    if ((license.ip_change_alerts || 0) > 0) {
      return { bg: 'bg-orange-500/20', icon: <ArrowLeftRight className="w-6 h-6 text-orange-400" /> }
    }
    return { bg: 'bg-emerald-500/20', icon: <CheckCircle className="w-6 h-6 text-emerald-400" /> }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Alert Center</h1>
            <p className="text-zinc-400 text-sm">Monitor your licenses in an organized way</p>
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
          Refresh
        </Button>
      </div>

      {/* Stats Summary - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card
          className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:border-zinc-600 ${alertTypeFilter === 'all' ? 'ring-2 ring-zinc-500' : ''}`}
          onClick={() => setAlertTypeFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totals.total}</p>
                <p className="text-xs text-zinc-500">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:border-red-500/50 ${alertTypeFilter === 'errors' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setAlertTypeFilter(alertTypeFilter === 'errors' ? 'all' : 'errors')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{totals.failed}</p>
                <p className="text-xs text-zinc-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:border-orange-500/50 ${alertTypeFilter === 'ip_changes' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setAlertTypeFilter(alertTypeFilter === 'ip_changes' ? 'all' : 'ip_changes')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{totals.ipChanges}</p>
                <p className="text-xs text-zinc-500">IP Changes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:border-emerald-500/50 ${alertTypeFilter === 'success' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setAlertTypeFilter(alertTypeFilter === 'success' ? 'all' : 'success')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{totals.success}</p>
                <p className="text-xs text-zinc-500">Successful</p>
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
                <p className="text-xs text-zinc-500">Licenses with Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active filter indicator */}
      {alertTypeFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge
            className={`${
              alertTypeFilter === 'errors' ? 'bg-red-500/20 text-red-400' :
              alertTypeFilter === 'ip_changes' ? 'bg-orange-500/20 text-orange-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            Filtering: {alertTypeFilter === 'errors' ? 'Errors' : alertTypeFilter === 'ip_changes' ? 'IP Changes' : 'Successful'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlertTypeFilter('all')}
            className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="licenses" className="data-[state=active]:bg-zinc-700">
            <FileText className="w-4 h-4 mr-2" />
            Alerts by License
          </TabsTrigger>
          <TabsTrigger value="monitored" className="data-[state=active]:bg-zinc-700">
            <BellRing className="w-4 h-4 mr-2" />
            Monitored ({monitoredLicenses.length})
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
                    placeholder="Search by name or license key..."
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
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most recent</SelectItem>
                      <SelectItem value="errors">Most errors</SelectItem>
                      <SelectItem value="total">Most alerts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-500">
                Showing {filteredLicenses.length} of {licensesSummary.length} licenses
                {alertTypeFilter !== 'all' && ` (filtered by ${alertTypeFilter === 'errors' ? 'errors' : alertTypeFilter === 'ip_changes' ? 'IP changes' : 'successful'})`}
              </div>
            </CardContent>
          </Card>

          {/* Licenses List */}
          <div className="space-y-3">
            {loading && licensesSummary.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center text-zinc-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-zinc-600" />
                  Loading licenses...
                </CardContent>
              </Card>
            ) : filteredLicenses.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center text-zinc-400">
                  {searchQuery ? (
                    <div>
                      <Search className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                      <p>No licenses match your search</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="text-amber-400 mt-2"
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Bell className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                      <p>No alerts recorded yet</p>
                      <p className="text-sm mt-1">Alerts will appear here when generated</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredLicenses.map((license) => {
                const iconConfig = getLicenseIcon(license)
                return (
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
                          {iconConfig.icon}
                        </div>

                        {/* License info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-white truncate">
                              {license.customer_name || 'No name'}
                            </p>
                          </div>
                          <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {license.license_key.slice(0, 16)}...
                          </code>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            <span>Last alert: {formatTimeAgo(license.last_alert_at)}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                {license.failed_alerts} errors
                              </Badge>
                              {(license.ip_change_alerts || 0) > 0 && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                  {license.ip_change_alerts} IP
                                </Badge>
                              )}
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                {license.success_alerts} ok
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {license.total_alerts} total alerts
                            </p>
                          </div>

                          {/* Arrow indicator */}
                          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Monitored Licenses Tab */}
        <TabsContent value="monitored" className="space-y-4 mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" />
                Licenses with Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLicenses ? (
                <div className="py-8 text-center text-zinc-400">Loading...</div>
              ) : monitoredLicenses.length === 0 ? (
                <div className="py-8 text-center text-zinc-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <p>No licenses with active alerts</p>
                  <p className="text-sm mt-1">Enable alerts on a license to see it here</p>
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
                          <p className="font-medium text-white">{license.customer_name || 'No name'}</p>
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
                              Fail
                            </Badge>
                          )}
                          {license.alert_on_success && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Success
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
