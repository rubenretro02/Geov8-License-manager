'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Search, X, Activity, CheckCircle, XCircle, Clock, MapPin, Laptop, CalendarDays } from 'lucide-react'
import type { CheckLog } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

interface LogsSectionProps {
  logs: CheckLog[]
}

export function LogsSection({ logs }: LogsSectionProps) {
  const { t } = useLanguage()
  const [filteredLogs, setFilteredLogs] = useState<CheckLog[]>(logs)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Auto-refresh logs every 15 seconds
  useAutoRefresh({ intervalSeconds: 15 })

  const filterLogs = useCallback(() => {
    let filtered = [...logs]

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.license_key?.toLowerCase().includes(searchLower) ||
          l.customer_name?.toLowerCase().includes(searchLower) ||
          l.hwid?.toLowerCase().includes(searchLower) ||
          l.ip_address?.toLowerCase().includes(searchLower) ||
          l.ip_country?.toLowerCase().includes(searchLower) ||
          l.ip_city?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((l) => l.status === statusFilter)
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((l) => new Date(l.created_at) >= fromDate)
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((l) => new Date(l.created_at) <= toDate)
    }

    setFilteredLogs(filtered)
  }, [logs, search, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    filterLogs()
  }, [filterLogs])

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = search || statusFilter !== 'all' || dateFrom || dateTo

  // Quick date shortcuts
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setDateFrom(today)
    setDateTo(today)
  }

  const setThisWeek = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    setDateFrom(monday.toISOString().split('T')[0])
    setDateTo(now.toISOString().split('T')[0])
  }

  const setThisMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    setDateFrom(firstDay.toISOString().split('T')[0])
    setDateTo(now.toISOString().split('T')[0])
  }

  // Calculate stats
  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === 'success' || l.status === 'valid').length,
    failed: logs.filter((l) => l.status === 'invalid' || l.status === 'expired' || l.status === 'error').length,
    today: logs.filter((l) => {
      const logDate = new Date(l.created_at)
      const today = new Date()
      return logDate.toDateString() === today.toDateString()
    }).length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'valid':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('valid')}
          </Badge>
        )
      case 'invalid':
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            {t('invalid')}
          </Badge>
        )
      case 'expired':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            {t('expired')}
          </Badge>
        )
      default:
        return (
          <Badge className="bg-zinc-500/20 text-zinc-400">
            {status}
          </Badge>
        )
    }
  }

  const statCards = [
    {
      title: t('totalChecks'),
      value: stats.total,
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('successfulChecks'),
      value: stats.success,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: t('failedChecks'),
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: t('todayChecks'),
      value: stats.today,
      icon: Clock,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('checkLogs')}</h1>
        <p className="text-zinc-400 mt-1">{t('checkLogsSubtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">{card.title}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder={t('searchLogsPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all" className="text-white focus:bg-zinc-800">{t('all')}</SelectItem>
                <SelectItem value="success" className="text-white focus:bg-zinc-800">{t('successFilter')}</SelectItem>
                <SelectItem value="valid" className="text-white focus:bg-zinc-800">{t('validFilter')}</SelectItem>
                <SelectItem value="invalid" className="text-white focus:bg-zinc-800">{t('invalidFilter')}</SelectItem>
                <SelectItem value="expired" className="text-white focus:bg-zinc-800">{t('expiredFilter')}</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dateFrom')}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px] bg-zinc-800 border-zinc-700 text-white [color-scheme:dark]"
            />
            <span className="text-zinc-500 text-sm">{t('dateTo').toLowerCase()}:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px] bg-zinc-800 border-zinc-700 text-white [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setToday}
              className={`text-xs border-zinc-700 ${
                dateFrom === new Date().toISOString().split('T')[0] && dateTo === new Date().toISOString().split('T')[0]
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {t('today')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setThisWeek}
              className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              {t('thisWeek')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setThisMonth}
              className="text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              {t('thisMonth')}
            </Button>
            {(dateFrom || dateTo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-zinc-500 hover:text-white"
              >
                <X className="h-3 w-3 mr-1" />
                {t('clearDates')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-semibold">{t('time')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('license')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('customer')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('hwid')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('location')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('ipAddress')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('status')}</TableHead>
              <TableHead className="text-zinc-400 font-semibold">{t('message')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                  {t('noLogs')}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="text-zinc-400 text-sm">
                    {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {log.license_key ? (
                      <code className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                        {log.license_key}
                      </code>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-white">
                      {log.customer_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.hwid ? (
                      <div className="flex items-center gap-1.5">
                        <Laptop className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs text-zinc-400 font-mono">
                          ...{log.hwid.slice(-8)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.ip_country || log.ip_city ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-sm text-zinc-300">
                          {[log.ip_city, log.ip_state, log.ip_country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-400 font-mono">
                      {log.ip_address || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="text-xs text-zinc-500 truncate block">
                      {log.message || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-zinc-500">
        {t('showing')} {filteredLogs.length} {t('of')} {logs.length} {t('logs')}
      </div>
    </div>
  )
}
