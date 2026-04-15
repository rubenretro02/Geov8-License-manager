'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { License, Profile } from '@/lib/types'
import { SearchFilters } from './search-filters'
import { LicensesTable } from './licenses-table'
import { useLanguage } from '@/lib/language-context'
import { toast } from 'sonner'
import type { StatsFilterType } from './stats-cards'

interface LicensesSectionProps {
  licenses: License[]
  statsFilter?: StatsFilterType
  onClearStatsFilter?: () => void
  profile?: Profile | null
}

export function LicensesSection({ licenses, statsFilter, onClearStatsFilter, profile }: LicensesSectionProps) {
  const { t } = useLanguage()
  const [filteredLicenses, setFilteredLicenses] = useState<License[]>(licenses)
  const [isExporting, setIsExporting] = useState(false)

  const handleFilter = useCallback((filtered: License[]) => {
    setFilteredLicenses(filtered)
  }, [])

  const exportToCSV = () => {
    setIsExporting(true)

    try {
      // Define CSV headers
      const headers = [
        'License Key',
        'Customer Name',
        'Customer Email',
        'Active',
        'Paid',
        'Trial',
        'HWID',
        'Activations',
        'Max Activations',
        'Payment Amount',
        'Payment Method',
        'Payment Date',
        'Notes',
        'Created At',
        'Expires At',
        'Activated At',
      ]

      // Map licenses to CSV rows
      const rows = filteredLicenses.map((license) => [
        license.license_key || '',
        license.customer_name || '',
        license.customer_email || '',
        license.is_active ? 'Yes' : 'No',
        license.is_paid ? 'Yes' : 'No',
        license.is_trial ? 'Yes' : 'No',
        license.hwid || '',
        license.current_activations?.toString() || '0',
        license.max_activations?.toString() || '1',
        license.payment_amount?.toString() || '',
        license.payment_method || '',
        license.payment_date ? format(new Date(license.payment_date), 'yyyy-MM-dd HH:mm:ss') : '',
        license.notes?.replace(/"/g, '""') || '',
        license.created_at ? format(new Date(license.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
        license.expires_at ? format(new Date(license.expires_at), 'yyyy-MM-dd HH:mm:ss') : '',
        license.activated_at ? format(new Date(license.activated_at), 'yyyy-MM-dd HH:mm:ss') : '',
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `licenses-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(t('exportSuccess'))
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Error exporting CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {t('allLicenses')}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            ({filteredLicenses.length} {t('of')} {licenses.length})
          </span>
        </h2>

        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          disabled={isExporting || filteredLicenses.length === 0}
          className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-emerald-400"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? t('exportingCSV') : t('exportCSV')}
        </Button>
      </div>

      <SearchFilters
        licenses={licenses}
        onFilter={handleFilter}
        statsFilter={statsFilter}
        onClearStatsFilter={onClearStatsFilter}
      />

      <LicensesTable licenses={filteredLicenses} profile={profile} />
    </div>
  )
}
