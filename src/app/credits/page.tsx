import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { getCurrentProfile } from '@/lib/actions/licenses'
import { getResellersWithCredits, getCreditTransactions, getCreditStats } from '@/lib/actions/credits'
import { CreditsSection } from '@/components/credits/credits-section'
import { Toaster } from 'sonner'

export default async function CreditsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  // Only super_admin can access this page
  if (profile.role !== 'super_admin') {
    redirect('/')
  }

  const [resellers, transactions, stats] = await Promise.all([
    getResellersWithCredits(),
    getCreditTransactions(),
    getCreditStats(),
  ])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <CreditsSection
          resellers={resellers}
          transactions={transactions}
          stats={stats}
        />
      </main>
    </div>
  )
}
