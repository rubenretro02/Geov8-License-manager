'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Shield, LogOut, User, Key, Users, Globe, Activity, Coins, FlaskConical, Download, Loader2, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface HeaderProps {
  user: SupabaseUser | null
  profile?: Profile | null
}

export function Header({ user, profile }: HeaderProps) {
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()
  const [downloading, setDownloading] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('app_version')
        .select('version, download_url')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data?.download_url) {
        alert('No download available')
        return
      }

      window.open(data.download_url, '_blank')
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to get download link')
    } finally {
      setDownloading(false)
    }
  }

  const getRoleBadge = () => {
    if (!profile) return null

    switch (profile.role) {
      case 'super_admin':
        return (
          <Badge className="bg-violet-500/20 text-violet-400 text-xs">
            {t('superAdmin')}
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 text-xs">
            {t('admin')}
          </Badge>
        )
      case 'user':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
            {t('user')}
          </Badge>
        )
    }
  }

  const navItems = [
    { href: '/', label: t('licenses'), icon: Key },
    { href: '/logs', label: t('logs'), icon: Activity },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    ...(profile?.role === 'super_admin' ? [{ href: '/credits', label: t('credits'), icon: Coins }] : []),
    ...(profile?.role !== 'user' ? [{ href: '/team', label: t('team'), icon: Users }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">License Manager</h1>
              <p className="text-xs text-zinc-500">Admin Panel</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    pathname === item.href
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="ghost"
              className="gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('downloadApp')}
            </Button>
          </nav>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            {/* Credits indicator for admins */}
            {profile?.role === 'admin' && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">{profile.credits || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <FlaskConical className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">
                    {(profile.trial_limit || 0) - (profile.trials_used_this_month || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => setLang('en')}
                  className={`text-zinc-300 focus:text-white focus:bg-zinc-800 ${lang === 'en' ? 'bg-zinc-800' : ''}`}
                >
                  {t('english')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLang('es')}
                  className={`text-zinc-300 focus:text-white focus:bg-zinc-800 ${lang === 'es' ? 'bg-zinc-800' : ''}`}
                >
                  {t('spanish')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {getRoleBadge()}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-zinc-700">
                    <AvatarFallback className="bg-zinc-800 text-emerald-400 font-semibold">
                      {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-zinc-800 text-emerald-400">
                      {profile?.username?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-white">
                      {profile?.full_name || profile?.username || 'User'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate max-w-[140px]">
                      @{profile?.username || user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <Link href="/profile">
                  <DropdownMenuItem className="text-zinc-400 focus:text-white focus:bg-zinc-800 cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    {t('profile')}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}
