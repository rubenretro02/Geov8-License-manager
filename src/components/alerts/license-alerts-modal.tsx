'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckLog } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  CheckCircle,
  Search,
  X,
  CalendarDays,
  Filter,
  RefreshCw,
  Wifi,
  MapPin,
  Clock,
  FileText
} from 'lucide-react'
import { getAlertsByLicense } from '@/lib/actions/alerts'

interface LicenseAlertsSummary {
  license_key: string
  customer_name: string | null
  total_alerts: number
  failed_alerts: number
  success_alerts: number
  last_alert_at: string | null
}

interface LicenseAlertsModalProps {
  license: LicenseAlertsSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LicenseAlertsModal({ license, open, onOpenChange }: LicenseAlertsModalProps) {
  const [logs, setLogs] = useState<CheckLog[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'error' | 'success'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'ip' | 'gps'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadAlerts = useCallback(async () => {
    if (!license) return
    setLoading(true)
    try {
      const data = await getAlertsByLicense(license.license_key, statusFilter, typeFilter)
      setLogs(data)
    } catch (error) {
      console.error('Error loading license alerts:', error)
    }
    setLoading(false)
  }, [license, statusFilter, typeFilter])

  useEffect(() => {
    if (open && license) {
      loadAlerts()
    }
  }, [open, license, loadAlerts])

  // Reset filters when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setStatusFilter('all')
      setTypeFilter('all')
      setDateFrom('')
      setDateTo('')
    }
  }, [open])

  // Helper to format date as YYYY-MM-DD in LOCAL timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Apply client-side filters
  const filteredLogs = useMemo(() => {
    let result = [...logs]

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((log) => {
        const searchableText = [
          log.hwid || '',
          log.ip_address || '',
          log.ip_city || '',
          log.ip_state || '',
          log.ip_country || '',
          log.message || '',
          log.status || '',
          new Date(log.created_at).toLocaleString(),
        ].join(' ').toLowerCase()
        return searchableText.includes(query)
      })
    }

    // Date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom + 'T00:00:00')
      result = result.filter((log) => new Date(log.created_at) >= fromDate)
    }
    if (dateTo) {
      const toDate = new Date(dateTo + 'T23:59:59.999')
      result = result.filter((log) => new Date(log.created_at) <= toDate)
    }

    return result
  }, [logs, searchQuery, dateFrom, dateTo])

  const getStatusBadge = (status: string) => {
    if (status === 'success' || status === 'valid') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Success</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Failed</Badge>
  }

  const getAlertIcon = (status: string) => {
    if (status === 'success' || status === 'valid') {
      return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
    }
    return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
  }

  const getErrorType = (message: string | null): 'ip' | 'gps' | 'other' => {
    if (!message) return 'other'
    const msgLower = message.toLowerCase()
    if (msgLower.includes('ip:') || msgLower.includes('ip location') || msgLower.includes('country')) return 'ip'
    if (msgLower.includes('gps:') || msgLower.includes('coordinate')) return 'gps'
    return 'other'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Quick date shortcuts
  const setToday = () => {
    const today = formatLocalDate(new Date())
    setDateFrom(today)
    setDateTo(today)
  }

  const setThisWeek = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    setDateFrom(formatLocalDate(monday))
    setDateTo(formatLocalDate(now))
  }

  const setThisMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    setDateFrom(formatLocalDate(firstDay))
    setDateTo(formatLocalDate(now))
  }

  const clearFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = searchQuery || dateFrom || dateTo

  if (!license) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-900 border-zinc-800 p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Alertas de Licencia
              </DialogTitle>
              <p className="text-sm text-zinc-400 mt-1">
                {license.customer_name || 'Sin nombre'} •{' '}
                <code className="text-emerald-400">{license.license_key.slice(0, 12)}...</code>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {license.failed_alerts} errores
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {license.success_alerts} exitosos
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAlerts}
                disabled={loading}
                className="border-zinc-700"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 space-y-3">
          {/* Search and Status */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar por IP, HWID, ubicacion, mensaje..."
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="error">Solo Errores</SelectItem>
                  <SelectItem value="success">Solo Exitos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-[120px] bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ip">IP</SelectItem>
                  <SelectItem value="gps">GPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] bg-zinc-800 border-zinc-700 text-white [color-scheme:dark] text-sm"
            />
            <span className="text-zinc-500 text-sm">a</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] bg-zinc-800 border-zinc-700 text-white [color-scheme:dark] text-sm"
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setToday}
                className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 h-8"
              >
                Hoy
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setThisWeek}
                className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 h-8"
              >
                Esta Semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setThisMonth}
                className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 h-8"
              >
                Este Mes
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-zinc-500 hover:text-white h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="text-xs text-zinc-500">
            Mostrando {filteredLogs.length} de {logs.length} alertas
            {hasFilters && ' (filtrado)'}
          </div>
        </div>

        {/* Alerts List */}
        <ScrollArea className="h-[50vh]">
          <div className="p-4 space-y-2">
            {loading && logs.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-zinc-600" />
                Cargando alertas...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                {hasFilters ? (
                  <div>
                    <Search className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p>No hay alertas que coincidan con tu busqueda</p>
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="text-amber-400 mt-2"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <div>
                    <CheckCircle className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p>No hay alertas para esta licencia</p>
                  </div>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => {
                const errorType = getErrorType(log.message)
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.status === 'success' || log.status === 'valid'
                        ? 'border-l-emerald-500 bg-zinc-800/30 border-zinc-800'
                        : 'border-l-red-500 bg-zinc-800/50 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          {getStatusBadge(log.status)}
                          {errorType !== 'other' && (
                            <Badge variant="outline" className="text-xs border-zinc-700">
                              {errorType === 'ip' ? (
                                <><Wifi className="w-3 h-3 mr-1" />IP</>
                              ) : (
                                <><MapPin className="w-3 h-3 mr-1" />GPS</>
                              )}
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm font-mono ${
                          log.status === 'success' || log.status === 'valid' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {log.message || 'Sin mensaje'}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                          <span>IP: {log.ip_address || '--'}</span>
                          <span>Ubicacion: {[log.ip_city, log.ip_state, log.ip_country].filter(Boolean).join(', ') || '--'}</span>
                          {log.hwid && <span>HWID: ...{log.hwid.slice(-8)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
