import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { getLicenses, getLicenseStats, getCurrentProfile } from '@/lib/actions/licenses'
import { Toaster } from 'sonner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  const [licenses, stats] = await Promise.all([
    getLicenses(),
    getLicenseStats(),
  ])

  const showRevenueChart = profile.role === 'super_admin' || profile.role === 'admin'
  const showMoneyStats = profile.role === 'super_admin' || profile.role === 'admin'

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <DashboardContent
          licenses={licenses}
          stats={stats}
          profile={profile}
          showRevenueChart={showRevenueChart}
          showMoneyStats={showMoneyStats}
        />
      </main>
    </div>
  )
}
