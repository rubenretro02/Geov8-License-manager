import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { getCurrentProfile, getCheckLogs } from '@/lib/actions/licenses'
import { LogsSection } from '@/components/logs/logs-section'
import { Toaster } from 'sonner'

export default async function LogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  // All roles can now access logs (filtered by their admin)
  const logs = await getCheckLogs()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <LogsSection logs={logs} />
        </div>
      </main>
    </div>
  )
}
