'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Shield, UserCheck } from 'lucide-react'
import type { Profile, UserRole } from '@/lib/types'
import { TeamTable } from './team-table'
import { CreateUserDialog } from './create-user-dialog'
import { useLanguage } from '@/lib/language-context'

interface TeamSectionProps {
  members: Profile[]
  stats: {
    total: number
    admins: number
    users: number
  }
  currentUserRole: UserRole
}

export function TeamSection({ members, stats, currentUserRole }: TeamSectionProps) {
  const { t } = useLanguage()

  const statCards = [
    {
      title: t('totalMembers'),
      value: stats.total,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('admins'),
      value: stats.admins,
      icon: Shield,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: t('users'),
      value: stats.users,
      icon: UserCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">{t('teamMembers')}</h2>
        <CreateUserDialog currentUserRole={currentUserRole} />
      </div>

      {/* Table */}
      <TeamTable members={members} currentUserRole={currentUserRole} />
    </div>
  )
}
