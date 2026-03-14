'use client'

import { useState, useEffect, useCallback } from 'react'
import { Profile, CheckLog, License } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { AlertTriangle, CheckCircle, RefreshCw, Bell, Filter, BellRing, Wifi, MapPin, Eye } from 'lucide-react'
import { getAlertLogs, getMonitoredLicenses } from '@/lib/actions/alerts'
import { updateLicenseAlerts } from '@/lib/actions/licenses'
import { toast } from 'sonner'

interface AlertsSectionProps {
  profile: Profile
}

export function AlertsSection({ profile }: AlertsSectionProps) {
  const [logs, setLogs] = useState<CheckLog[]>([])
  const [monitoredLicenses, setMonitoredLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLicenses, setLoadingLicenses] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'success'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'ip' | 'gps'>('all')
  const [activeTab, setActiveTab] = useState('logs')

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAlertLogs(filter, typeFilter)
      setLogs(data)
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
    setLoading(false)
  }, [filter, typeFilter])

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
    loadAlerts()
    loadMonitoredLicenses()
    const interval = setInterval(() => {
      loadAlerts()
      loadMonitoredLicenses()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAlerts, loadMonitoredLicenses])

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

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Success</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
  }

  const getAlertIcon = (status: string) => {
    if (status === 'success') {
      return <CheckCircle className="w-5 h-5 text-emerald-400" />
    }
    return <AlertTriangle className="w-5 h-5 text-red-400" />
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getErrorType = (message: string | null): 'ip' | 'gps' | 'other' => {
    if (!message) return 'other'
    const msgLower = message.toLowerCase()
    if (msgLower.includes('ip:') || msgLower.includes('ip location')) return 'ip'
    if (msgLower.includes('gps:') || msgLower.includes('coordinate')) return 'gps'
    return 'other'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Alerts</h1>
            <p className="text-zinc-400 text-sm">Monitor check results in real-time</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { loadAlerts(); loadMonitoredLicenses(); }}
          disabled={loading}
          className="border-zinc-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="logs" className="data-[state=active]:bg-zinc-700">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alert Logs
          </TabsTrigger>
          <TabsTrigger value="monitored" className="data-[state=active]:bg-zinc-700">
            <BellRing className="w-4 h-4 mr-2" />
            Monitored ({monitoredLicenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Alert Logs Tab */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* Filters */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Filter className="w-4 h-4 text-zinc-400" />
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="error">Failed Only</SelectItem>
                    <SelectItem value="success">Success Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ip">IP Errors</SelectItem>
                    <SelectItem value="gps">GPS Errors</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-zinc-500 ml-auto">
                  {logs.length} alerts • Auto-refresh: 30s
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-3">
            {loading && logs.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-8 text-center text-zinc-400">
                  Loading alerts...
                </CardContent>
              </Card>
            ) : logs.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-8 text-center text-zinc-400">
                  No alerts found
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card
                  key={log.id}
                  className={`bg-zinc-900 border-l-4 ${
                    log.status === 'success'
                      ? 'border-l-emerald-500 border-zinc-800'
                      : 'border-l-red-500 border-zinc-800'
                  }`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {getAlertIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(log.status)}
                          <Badge variant="outline" className="text-xs border-zinc-700">
                            {getErrorType(log.message).toUpperCase()}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mb-1">
                          {log.customer_name || 'Unknown'} • {log.license_key?.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-red-400 font-mono">
                          {log.message || 'No message'}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                          <span>IP: {log.ip_address || '--'}</span>
                          <span>Location: {log.ip_city}, {log.ip_state}</span>
                        </div>
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
                Licenses with Alerts Enabled
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLicenses ? (
                <div className="py-8 text-center text-zinc-400">Loading...</div>
              ) : monitoredLicenses.length === 0 ? (
                <div className="py-8 text-center text-zinc-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <p>No licenses with alerts enabled</p>
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
                      <div className="flex items-center gap-4">
                        {/* Alert types badges */}
                        <div className="flex gap-2">
                          {license.alert_ip && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              <Wifi className="w-3 h-3 mr-1" />
                              IP
                            </Badge>
                          )}
                          {license.alert_gps && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                          {license.alert_on_fail && (
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
    </div>
  )
}
