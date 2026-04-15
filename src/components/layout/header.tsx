'use client'

import { useState, useEffect } from 'react'
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
import {
  Shield,
  LogOut,
  User,
  Key,
  Users,
  Globe,
  Activity,
  Coins,
  FlaskConical,
  Download,
  Loader2,
  Bell,
  Copy,
  Check,
  ChevronDown,
  Receipt,
  HelpCircle,
  Ticket,
} from 'lucide-react'
import { toast } from 'sonner'
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
  const [copied, setCopied] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  const handleSignOut = async () => {
    await signOut()
  }

  const getDownloadInfo = async (): Promise<{ url: string; version: string } | null> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('app_version')
        .select('version, download_url')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data?.download_url) {
        return null
      }

      return { url: data.download_url, version: data.version }
    } catch (err) {
      console.error('Error getting download info:', err)
      return null
    }
  }

  // Load app version on mount
  useEffect(() => {
    const loadVersion = async () => {
      const info = await getDownloadInfo()
      if (info) {
        setAppVersion(info.version)
      }
    }
    loadVersion()
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const info = await getDownloadInfo()
      if (!info) {
        toast.error(lang === 'es' ? 'No hay descarga disponible' : 'No download available')
        return
      }
      window.open(info.url, '_blank')
    } catch (err) {
      console.error('Download error:', err)
      toast.error(lang === 'es' ? 'Error al descargar' : 'Failed to download')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      const info = await getDownloadInfo()
      if (!info) {
        toast.error(lang === 'es' ? 'No hay link disponible' : 'No link available')
        return
      }
      await navigator.clipboard.writeText(info.url)
      setCopied(true)
      toast.success(lang === 'es' ? 'Link copiado!' : 'Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy error:', err)
      toast.error(lang === 'es' ? 'Error al copiar' : 'Failed to copy')
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

  // Check if user is self-registered (can see store/orders) vs created by admin
  // Self-registered: admin_id === profile.id OR admin_id is null (legacy/before migration)
  const isSelfRegisteredUser = profile?.role === 'user' &&
    (profile?.admin_id === profile?.id || profile?.admin_id === null || profile?.admin_id === undefined)

  const navItems = [
    { href: '/dashboard', label: t('licenses'), icon: Key },
    { href: '/logs', label: t('logs'), icon: Activity },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    ...(profile?.role === 'super_admin' ? [{ href: '/credits', label: t('credits'), icon: Coins }] : []),
    ...(profile?.role !== 'user' ? [{ href: '/team', label: t('team'), icon: Users }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
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
            {/* Buy Credits Button - Only for admins, super_admins, and self-registered users */}
            {(profile?.role === 'super_admin' || profile?.role === 'admin' || isSelfRegisteredUser) && (
              <Link href="/store">
                <Button
                  variant="ghost"
                  className="gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                >
                  <Coins className="w-4 h-4" />
                  {lang === 'es' ? 'Comprar Créditos' : 'Buy Credits'}
                </Button>
              </Link>
            )}
            {/* Orders Button - Only for admins, super_admins, and self-registered users */}
            {(profile?.role === 'super_admin' || profile?.role === 'admin' || isSelfRegisteredUser) && (
              <Link href="/orders">
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    pathname === '/orders'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  {lang === 'es' ? 'Pedidos' : 'Orders'}
                </Button>
              </Link>
            )}
            {/* Help Center Link */}
            <Link href="/help">
              <Button
                variant="ghost"
                className={`gap-2 ${
                  pathname === '/help'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                {lang === 'es' ? 'Ayuda' : 'Help'}
              </Button>
            </Link>
            {/* Support Link */}
            <Link href="/support">
              <Button
                variant="ghost"
                className={`gap-2 ${
                  pathname === '/support' || pathname.startsWith('/tickets')
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Ticket className="w-4 h-4" />
                {lang === 'es' ? 'Soporte' : 'Support'}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadApp')}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 min-w-[180px]">
                {/* Version Header */}
                <div className="px-2 py-2 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {lang === 'es' ? 'Versión' : 'Version'}
                    </span>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      {appVersion || '...'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuItem
                  onClick={handleDownload}
                  disabled={downloading}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer mt-1"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {lang === 'es' ? 'Descargar' : 'Download'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyLink}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {lang === 'es' ? 'Copiar Link' : 'Copy Link'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            {/* Credits indicator - Only for admins and self-registered users (not users created by admin) */}
            {(profile?.role === 'admin' || isSelfRegisteredUser) && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">{profile.credits || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <FlaskConical className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">
                    {(() => {
                      // Self-registered users always have 1 trial limit
                      const effectiveLimit = isSelfRegisteredUser ? 1 : profile.trial_limit
                      const trialsUsed = profile.trials_used_this_month || 0
                      if (effectiveLimit && effectiveLimit > 0) {
                        return Math.max(0, effectiveLimit - trialsUsed)
                      }
                      return '∞'
                    })()}
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
