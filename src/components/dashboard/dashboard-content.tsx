'use client'

import { useState } from 'react'
import { StatsCards, StatsFilterType } from './stats-cards'
import { LicensesSection } from './licenses-section'
import { RevenueChart } from './revenue-chart'
import { DashboardHeader } from './dashboard-header'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import type { License, Profile } from '@/lib/types'

interface DashboardContentProps {
  licenses: License[]
  stats: {
    total: number
    active: number
    expired: number
    paid: number
    unpaid: number
    revenue: number
  }
  profile: Profile
  showRevenueChart: boolean
  showMoneyStats?: boolean
}

export function DashboardContent({ licenses, stats, profile, showRevenueChart, showMoneyStats = true }: DashboardContentProps) {
  const [statsFilter, setStatsFilter] = useState<StatsFilterType>(null)

  // Auto-refresh data every 30 seconds
  useAutoRefresh({ intervalSeconds: 30 })

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader profile={profile} />

      {/* Stats */}
      <StatsCards
        stats={stats}
        activeFilter={statsFilter}
        onFilterSelect={setStatsFilter}
        showMoneyStats={showMoneyStats}
      />

      {/* Revenue Chart - Only for admins */}
      {showRevenueChart && <RevenueChart licenses={licenses} />}

      {/* Licenses Table with Filters */}
      <LicensesSection licenses={licenses} statsFilter={statsFilter} onClearStatsFilter={() => setStatsFilter(null)} profile={profile} />
    </div>
  )
}
