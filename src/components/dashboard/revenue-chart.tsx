'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign } from 'lucide-react'
import type { License } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface RevenueChartProps {
  licenses: License[]
}

export function RevenueChart({ licenses }: RevenueChartProps) {
  const { t } = useLanguage()

  const chartData = useMemo(() => {
    // Get last 6 months
    const months: { month: string; revenue: number; licenses: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthLicenses = licenses.filter((l) => {
        if (!l.payment_date || !l.is_paid) return false
        const paymentDate = new Date(l.payment_date)
        return paymentDate >= monthStart && paymentDate <= monthEnd
      })

      const revenue = monthLicenses.reduce((sum, l) => sum + (l.payment_amount || 0), 0)

      months.push({
        month: monthKey,
        revenue,
        licenses: monthLicenses.length,
      })
    }

    return months
  }, [licenses])

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
  const totalLicenses = chartData.reduce((sum, d) => sum + d.licenses, 0)
  const avgRevenue = totalRevenue / 6

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-1">{label}</p>
          <p className="text-emerald-400 text-sm">
            ${payload[0].value.toLocaleString()}
          </p>
          {payload[1] && (
            <p className="text-blue-400 text-sm">
              {payload[1].value} licenses
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Chart */}
      <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            {t('monthlyRevenue')}
          </CardTitle>
          <p className="text-sm text-zinc-500">{t('lastMonths')}</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="space-y-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t('revenue')} (6 mo)</p>
                <p className="text-2xl font-bold text-white">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t('paid')} (6 mo)</p>
                <p className="text-2xl font-bold text-white">
                  {totalLicenses}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <DollarSign className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Avg/Month</p>
                <p className="text-2xl font-bold text-white">
                  ${avgRevenue.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
