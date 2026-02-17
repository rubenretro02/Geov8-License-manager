'use client'

import { useLanguage } from '@/lib/language-context'
import { CreateLicenseDialog } from './create-license-dialog'
import type { Profile } from '@/lib/types'

interface DashboardHeaderProps {
  profile?: Profile | null
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboardTitle')}</h1>
        <p className="text-zinc-400 mt-1">{t('dashboardSubtitle')}</p>
      </div>
      <CreateLicenseDialog profile={profile} />
    </div>
  )
}
