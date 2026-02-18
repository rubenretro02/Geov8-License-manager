'use client'

import { useState } from 'react'
import { StatsCards, StatsFilterType } from './stats-cards'
import { LicensesSection } from './licenses-section'
import { RevenueChart } from './revenue-chart'
import { DashboardHeader } from './dashboard-header'
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
}

export function DashboardContent({ licenses, stats, profile, showRevenueChart }: DashboardContentProps) {
  const [statsFilter, setStatsFilter] = useState<StatsFilterType>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader profile={profile} />

      {/* Stats */}
      <StatsCards
        stats={stats}
        activeFilter={statsFilter}
        onFilterSelect={setStatsFilter}
      />

      {/* Revenue Chart - Only for admins */}
      {showRevenueChart && <RevenueChart licenses={licenses} />}

      {/* Licenses Table with Filters */}
      <LicensesSection licenses={licenses} statsFilter={statsFilter} onClearStatsFilter={() => setStatsFilter(null)} profile={profile} />
    </div>
  )
}
