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
  FileText,
  ArrowLeftRight
} from 'lucide-react'
import { getAlertsByLicense } from '@/lib/actions/alerts'

interface LicenseAlertsSummary {
  license_key: string
  customer_name: string | null
  total_alerts: number
  failed_alerts: number
  success_alerts: number
  ip_change_alerts: number
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

  // Check if log is IP change
  const checkIsIpChange = (log: CheckLog): boolean => {
    if (log.status === 'ip_change') return true
    const msg = (log.message || '').toLowerCase()
    return msg.includes('ip change') || msg.includes('ip changed') || msg.includes('new ip') || msg.includes('different ip')
  }

  // Calculate real counts from loaded logs
  const realCounts = useMemo(() => {
    let errors = 0
    let success = 0
    let ipChanges = 0

    logs.forEach(log => {
      if (checkIsIpChange(log)) {
        ipChanges++
      } else if (log.status === 'valid' || log.status === 'success') {
        success++
      } else {
        errors++
      }
    })

    return { errors, success, ipChanges, total: logs.length }
  }, [logs])

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

  const getStatusBadge = (log: CheckLog) => {
    // Check for IP change first
    if (checkIsIpChange(log)) {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">IP Change</Badge>
    }
    const status = log.status
    if (status === 'success' || status === 'valid') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Success</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Failed</Badge>
  }

  const getAlertIcon = (log: CheckLog) => {
    if (checkIsIpChange(log)) {
      return <ArrowLeftRight className="w-4 h-4 text-orange-400 shrink-0" />
    }
    const status = log.status
    if (status === 'success' || status === 'valid') {
      return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
    }
    return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
  }

  const getAlertBorderColor = (log: CheckLog) => {
    if (checkIsIpChange(log)) {
      return 'border-l-orange-500 bg-orange-500/5'
    }
    const status = log.status
    if (status === 'success' || status === 'valid') {
      return 'border-l-emerald-500 bg-zinc-800/30'
    }
    return 'border-l-red-500 bg-zinc-800/50'
  }

  const getMessageColor = (log: CheckLog) => {
    if (checkIsIpChange(log)) {
      return 'text-orange-400'
    }
    const status = log.status
    if (status === 'success' || status === 'valid') {
      return 'text-emerald-400'
    }
    return 'text-red-400'
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
                License Alerts
              </DialogTitle>
              <p className="text-sm text-zinc-400 mt-1">
                {license.customer_name || 'No name'} •{' '}
                <code className="text-emerald-400">{license.license_key.slice(0, 12)}...</code>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {realCounts.errors} errors
                </Badge>
                {realCounts.ipChanges > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {realCounts.ipChanges} IP
                  </Badge>
                )}
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {realCounts.success} ok
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
                placeholder="Search by IP, HWID, location, message..."
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="error">Errors Only</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-[120px] bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
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
            <span className="text-zinc-500 text-sm">to</span>
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
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setThisWeek}
                className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 h-8"
              >
                This Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setThisMonth}
                className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 h-8"
              >
                This Month
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
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="text-xs text-zinc-500">
            Showing {filteredLogs.length} of {logs.length} alerts
            {hasFilters && ' (filtered)'}
          </div>
        </div>

        {/* Alerts List */}
        <ScrollArea className="h-[50vh]">
          <div className="p-4 space-y-2">
            {loading && logs.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-zinc-600" />
                Loading alerts...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                {hasFilters ? (
                  <div>
                    <Search className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p>No alerts match your search</p>
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="text-amber-400 mt-2"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <CheckCircle className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p>No alerts for this license</p>
                  </div>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => {
                const errorType = getErrorType(log.message)
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 border-zinc-800 ${getAlertBorderColor(log)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(log)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          {getStatusBadge(log)}
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
                        <p className={`text-sm font-mono ${getMessageColor(log)}`}>
                          {log.message || 'No message'}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                          <span>IP: {log.ip_address || '--'}</span>
                          <span>Location: {[log.ip_city, log.ip_state, log.ip_country].filter(Boolean).join(', ') || '--'}</span>
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
