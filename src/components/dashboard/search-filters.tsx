'use client'

import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { License } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'
import type { StatsFilterType } from './stats-cards'

interface SearchFiltersProps {
  licenses: License[]
  onFilter: (filtered: License[]) => void
  statsFilter?: StatsFilterType
  onClearStatsFilter?: () => void
}

export function SearchFilters({ licenses, onFilter, statsFilter, onClearStatsFilter }: SearchFiltersProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')

  const filterLicenses = useCallback(() => {
    let filtered = [...licenses]
    const now = new Date()

    // Apply stats filter first
    if (statsFilter && statsFilter !== 'all') {
      switch (statsFilter) {
        case 'active':
          filtered = filtered.filter((l) => l.is_active && (!l.expires_at || new Date(l.expires_at) > now))
          break
        case 'expired':
          filtered = filtered.filter((l) => l.expires_at && new Date(l.expires_at) <= now)
          break
        case 'paid':
          filtered = filtered.filter((l) => l.is_paid)
          break
        case 'unpaid':
          filtered = filtered.filter((l) => !l.is_paid)
          break
      }
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.license_key.toLowerCase().includes(searchLower) ||
          l.customer_name?.toLowerCase().includes(searchLower) ||
          l.customer_email?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter (only apply if no stats filter is active for status-related)
    if (statusFilter !== 'all' && !['active'].includes(statsFilter || '')) {
      if (statusFilter === 'trial') {
        filtered = filtered.filter((l) => l.is_trial)
      } else {
        filtered = filtered.filter((l) =>
          statusFilter === 'active' ? l.is_active : !l.is_active
        )
      }
    }

    // Payment filter (only apply if no stats filter is active for payment-related)
    if (paymentFilter !== 'all' && !['paid', 'unpaid'].includes(statsFilter || '')) {
      filtered = filtered.filter((l) =>
        paymentFilter === 'paid' ? l.is_paid : !l.is_paid
      )
    }

    // Expiry filter (only apply if no stats filter is active for expiry-related)
    if (expiryFilter !== 'all' && !['expired'].includes(statsFilter || '')) {
      filtered = filtered.filter((l) => {
        if (!l.expires_at) return expiryFilter === 'permanent'
        const expiry = new Date(l.expires_at)
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        switch (expiryFilter) {
          case 'expired':
            return daysLeft < 0
          case 'expiring':
            return daysLeft >= 0 && daysLeft <= 7
          case 'valid':
            return daysLeft > 7
          case 'permanent':
            return false
          default:
            return true
        }
      })
    }

    onFilter(filtered)
  }, [licenses, search, statusFilter, paymentFilter, expiryFilter, statsFilter, onFilter])

  useEffect(() => {
    filterLicenses()
  }, [filterLicenses])

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPaymentFilter('all')
    setExpiryFilter('all')
    if (onClearStatsFilter) {
      onClearStatsFilter()
    }
  }

  const hasFilters = search || statusFilter !== 'all' || paymentFilter !== 'all' || expiryFilter !== 'all' || (statsFilter && statsFilter !== 'all')

  const getStatsFilterLabel = () => {
    switch (statsFilter) {
      case 'active':
        return t('active')
      case 'expired':
        return t('expired')
      case 'paid':
        return t('paid')
      case 'unpaid':
        return t('unpaid')
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {/* Stats filter badge */}
      {statsFilter && statsFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Active filter:</span>
          <Badge
            className="bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30"
            onClick={onClearStatsFilter}
          >
            {getStatsFilterLabel()}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-white focus:bg-zinc-800">{t('all')}</SelectItem>
              <SelectItem value="active" className="text-white focus:bg-zinc-800">{t('activeFilter')}</SelectItem>
              <SelectItem value="inactive" className="text-white focus:bg-zinc-800">{t('inactiveFilter')}</SelectItem>
              <SelectItem value="trial" className="text-white focus:bg-zinc-800">{t('trialFilter')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder={t('payment')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-white focus:bg-zinc-800">{t('all')}</SelectItem>
              <SelectItem value="paid" className="text-white focus:bg-zinc-800">{t('paidFilter')}</SelectItem>
              <SelectItem value="unpaid" className="text-white focus:bg-zinc-800">{t('unpaidFilter')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={expiryFilter} onValueChange={setExpiryFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder={t('expires')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-white focus:bg-zinc-800">{t('all')}</SelectItem>
              <SelectItem value="expired" className="text-white focus:bg-zinc-800">{t('expiredFilter')}</SelectItem>
              <SelectItem value="expiring" className="text-white focus:bg-zinc-800">{t('expiringFilter')}</SelectItem>
              <SelectItem value="valid" className="text-white focus:bg-zinc-800">{t('validFilter')}</SelectItem>
              <SelectItem value="permanent" className="text-white focus:bg-zinc-800">{t('permanentFilter')}</SelectItem>
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
    </div>
  )
}
