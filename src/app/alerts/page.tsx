import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { AlertsSection } from '@/components/alerts/alerts-section'
import { getCurrentProfile } from '@/lib/actions/licenses'
import { Toaster } from 'sonner'

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  // Users can see alerts, but only for their own licenses (filtered in the component)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <AlertsSection profile={profile} />
      </main>
    </div>
  )
}
