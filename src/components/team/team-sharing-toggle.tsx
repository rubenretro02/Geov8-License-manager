'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Eye, Loader2 } from 'lucide-react'
import { setTeamLicenseSharing } from '@/lib/actions/users'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface TeamSharingToggleProps {
  enabled: boolean
}

export function TeamSharingToggle({ enabled }: TeamSharingToggleProps) {
  const { t } = useLanguage()
  const [checked, setChecked] = useState(enabled)
  const [loading, setLoading] = useState(false)

  const handleChange = async (next: boolean) => {
    setLoading(true)
    // Optimistic update
    setChecked(next)

    const result = await setTeamLicenseSharing(next)

    if (result.success) {
      toast.success(next ? t('teamSharingEnabled') : t('teamSharingDisabled'))
    } else {
      // Revert on failure
      setChecked(!next)
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Eye className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t('teamSharingTitle')}</p>
              <p className="text-xs text-zinc-500">{t('teamSharingDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
            <Switch
              checked={checked}
              onCheckedChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
