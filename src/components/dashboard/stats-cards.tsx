'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Key, CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export type StatsFilterType = 'all' | 'active' | 'expired' | 'paid' | 'unpaid' | null

interface StatsCardsProps {
  stats: {
    total: number
    active: number
    expired: number
    paid: number
    unpaid: number
    revenue: number
  }
  activeFilter?: StatsFilterType
  onFilterSelect?: (filter: StatsFilterType) => void
  showMoneyStats?: boolean
}

export function StatsCards({ stats, activeFilter, onFilterSelect, showMoneyStats = true }: StatsCardsProps) {
  const { t } = useLanguage()

  const allCards = [
    {
      title: t('totalLicenses'),
      value: stats.total,
      icon: Key,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      filter: 'all' as StatsFilterType,
      ringColor: 'ring-blue-500/50',
      isMoneyRelated: false,
    },
    {
      title: t('active'),
      value: stats.active,
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      filter: 'active' as StatsFilterType,
      ringColor: 'ring-emerald-500/50',
      isMoneyRelated: false,
    },
    {
      title: t('expired'),
      value: stats.expired,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      filter: 'expired' as StatsFilterType,
      ringColor: 'ring-amber-500/50',
      isMoneyRelated: false,
    },
    {
      title: t('paid'),
      value: stats.paid,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-400',
      filter: 'paid' as StatsFilterType,
      ringColor: 'ring-green-500/50',
      isMoneyRelated: true,
    },
    {
      title: t('unpaid'),
      value: stats.unpaid,
      icon: XCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      filter: 'unpaid' as StatsFilterType,
      ringColor: 'ring-red-500/50',
      isMoneyRelated: true,
    },
    {
      title: t('revenue'),
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-400',
      filter: null, // Revenue doesn't filter
      ringColor: 'ring-violet-500/50',
      isMoneyRelated: true,
    },
  ]

  // Filter out money-related cards if showMoneyStats is false
  const cards = showMoneyStats
    ? allCards
    : allCards.filter((card) => !card.isMoneyRelated)

  const handleClick = (filter: StatsFilterType) => {
    if (filter === null) return // Revenue card doesn't filter
    if (onFilterSelect) {
      // If clicking the same filter, clear it
      if (activeFilter === filter) {
        onFilterSelect(null)
      } else {
        onFilterSelect(filter)
      }
    }
  }

  // Determine grid columns based on number of cards
  const gridCols = showMoneyStats
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
    : 'grid-cols-1 sm:grid-cols-3'

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {cards.map((card) => {
        const isActive = activeFilter === card.filter
        const isClickable = card.filter !== null

        return (
          <Card
            key={card.title}
            onClick={() => handleClick(card.filter)}
            className={`bg-zinc-900/50 border-zinc-800 transition-all duration-200 ${
              isClickable
                ? 'cursor-pointer hover:border-zinc-600 hover:scale-[1.02] active:scale-[0.98]'
                : ''
            } ${isActive ? `ring-2 ${card.ringColor} border-transparent` : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">{card.title}</p>
                  <p className={`text-xl font-bold ${card.textColor}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
