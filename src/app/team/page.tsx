import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { getTeamMembers, getTeamStats } from '@/lib/actions/users'
import { getCurrentProfile } from '@/lib/actions/licenses'
import { TeamSection } from '@/components/team/team-section'
import { TeamHeader } from '@/components/team/team-header'
import { Toaster } from 'sonner'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  // Only super_admin and admin can access this page
  if (profile.role === 'user') {
    redirect('/')
  }

  const [members, stats] = await Promise.all([
    getTeamMembers(),
    getTeamStats(),
  ])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} profile={profile} />
      <Toaster position="top-right" theme="dark" richColors />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <TeamHeader role={profile.role} />

          <TeamSection
            members={members}
            stats={stats}
            currentUserRole={profile.role}
          />
        </div>
      </main>
    </div>
  )
}
