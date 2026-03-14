'use client'

import { useLanguage } from '@/lib/language-context'

interface TeamHeaderProps {
  role: string
}

export function TeamHeader({ role }: TeamHeaderProps) {
  const { t } = useLanguage()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{t('teamManagement')}</h1>
      <p className="text-zinc-400 mt-1">
        {role === 'super_admin' ? t('manageAdmins') : t('manageYourTeam')}
      </p>
    </div>
  )
}
