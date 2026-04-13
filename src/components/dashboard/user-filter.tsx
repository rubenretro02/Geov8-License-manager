'use client'

import { useState, useMemo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Key,
  CheckCircle2,
  XCircle,
  Crown
} from 'lucide-react'
import type { License, Profile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'
import { cn } from '@/lib/utils'

interface UserStats {
  name: string
  email?: string | null
  adminName?: string | null
  totalLicenses: number
  activeLicenses: number
  paidLicenses: number
  unpaidLicenses: number
  totalRevenue: number
  expiredLicenses: number
}

interface UserFilterProps {
  licenses: License[]
  profile: Profile | null
  selectedUser: string
  onSelectUser: (user: string) => void
}

// Generate consistent color based on username
function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-red-500/20 text-red-400 border-red-500/30',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserFilter({ licenses, profile, selectedUser, onSelectUser }: UserFilterProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdminOrAbove = profile?.role === 'super_admin' || profile?.role === 'admin'

  // Calculate stats per user - MUST be called unconditionally
  const userStats = useMemo(() => {
    if (!isAdminOrAbove) return []

    const stats = new Map<string, UserStats>()
    const now = new Date()

    for (const license of licenses) {
      const creatorName = license.created_by_name || 'Unknown'

      if (!stats.has(creatorName)) {
        stats.set(creatorName, {
          name: creatorName,
          email: license.created_by_email,
          adminName: license.created_by_admin_name,
          totalLicenses: 0,
          activeLicenses: 0,
          paidLicenses: 0,
          unpaidLicenses: 0,
          totalRevenue: 0,
          expiredLicenses: 0,
        })
      }

      const userStat = stats.get(creatorName)!
      userStat.totalLicenses++

      if (license.is_active && (!license.expires_at || new Date(license.expires_at) > now)) {
        userStat.activeLicenses++
      }

      if (license.expires_at && new Date(license.expires_at) <= now) {
        userStat.expiredLicenses++
      }

      if (license.is_paid) {
        userStat.paidLicenses++
        userStat.totalRevenue += license.payment_amount || 0
      } else {
        userStat.unpaidLicenses++
      }
    }

    return Array.from(stats.values()).sort((a, b) => b.totalLicenses - a.totalLicenses)
  }, [licenses, isAdminOrAbove])

  // Filter users by search query - MUST be called unconditionally
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return userStats
    const query = searchQuery.toLowerCase()
    return userStats.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.adminName?.toLowerCase().includes(query)
    )
  }, [userStats, searchQuery])

  // Calculate total stats - MUST be called unconditionally
  const totalStats = useMemo(() => {
    const now = new Date()
    return {
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter(l => l.is_active && (!l.expires_at || new Date(l.expires_at) > now)).length,
      paidLicenses: licenses.filter(l => l.is_paid).length,
      totalRevenue: licenses.reduce((sum, l) => sum + (l.is_paid ? (l.payment_amount || 0) : 0), 0),
    }
  }, [licenses])

  const selectedUserStats = selectedUser !== 'all'
    ? userStats.find(u => u.name === selectedUser)
    : null

  // Don't show for regular users - move AFTER all hooks
  if (!isAdminOrAbove) return null

  return (
    <div className="mb-6 bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white flex items-center gap-2">
              {t('filterByUser') || 'Filter by User'}
              {selectedUser !== 'all' && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  {selectedUser}
                </Badge>
              )}
            </h3>
            <p className="text-sm text-zinc-500">
              {userStats.length} {t('usersWithLicenses') || 'users with licenses'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedUser !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelectUser('all')
              }}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              {t('clearFilter') || 'Clear'}
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Search */}
          {userStats.length > 4 && (
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder={t('searchUsers') || 'Search users...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
          )}

          {/* User Grid */}
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[400px] overflow-y-auto">
            {/* All Users Card */}
            <button
              type="button"
              onClick={() => onSelectUser('all')}
              className={cn(
                'group p-4 rounded-xl border-2 text-left transition-all',
                selectedUser === 'all'
                  ? 'bg-emerald-500/10 border-emerald-500/50'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-zinc-700/50 rounded-lg group-hover:bg-zinc-700 transition-colors">
                  <Users className="h-5 w-5 text-zinc-300" />
                </div>
                {selectedUser === 'all' && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <h4 className="font-semibold text-white mb-1">
                {t('allUsers') || 'All Users'}
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-400">
                  <Key className="h-3.5 w-3.5 inline mr-1" />
                  {totalStats.totalLicenses}
                </span>
                <span className="text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                  {totalStats.activeLicenses}
                </span>
                {isSuperAdmin && (
                  <span className="text-green-400">
                    <DollarSign className="h-3.5 w-3.5 inline" />
                    {totalStats.totalRevenue.toLocaleString()}
                  </span>
                )}
              </div>
            </button>

            {/* Individual User Cards */}
            {filteredUsers.map((user) => (
              <button
                key={user.name}
                type="button"
                onClick={() => onSelectUser(user.name)}
                className={cn(
                  'group p-4 rounded-xl border-2 text-left transition-all',
                  selectedUser === user.name
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <Avatar className={cn('h-10 w-10 border', getAvatarColor(user.name))}>
                    <AvatarFallback className="bg-transparent text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser === user.name && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  )}
                </div>

                <h4 className="font-semibold text-white mb-0.5 truncate">
                  {user.name}
                </h4>
                {isSuperAdmin && user.adminName && (
                  <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1 truncate">
                    <Crown className="h-3 w-3" />
                    {user.adminName}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                  <Badge variant="outline" className="bg-zinc-700/50 border-zinc-600 text-zinc-300">
                    <Key className="h-3 w-3 mr-1" />
                    {user.totalLicenses}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {user.activeLicenses}
                  </Badge>
                  {user.unpaidLicenses > 0 && (
                    <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      {user.unpaidLicenses}
                    </Badge>
                  )}
                </div>

                {isSuperAdmin && user.totalRevenue > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    <span className="text-green-400 text-sm font-medium">
                      <DollarSign className="h-3.5 w-3.5 inline" />
                      {user.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                )}
              </button>
            ))}

            {filteredUsers.length === 0 && searchQuery && (
              <div className="col-span-full text-center py-8 text-zinc-500">
                {t('noUsersFound') || 'No users found'}
              </div>
            )}
          </div>

          {/* Selected User Stats */}
          {selectedUserStats && (
            <div className="p-4 bg-zinc-800/30 border-t border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className={cn('h-12 w-12 border-2', getAvatarColor(selectedUserStats.name))}>
                  <AvatarFallback className="bg-transparent text-lg font-semibold">
                    {getInitials(selectedUserStats.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-white text-lg">{selectedUserStats.name}</h4>
                  {selectedUserStats.email && (
                    <p className="text-sm text-zinc-500">{selectedUserStats.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">{t('totalLicenses') || 'Total'}</p>
                  <p className="text-xl font-bold text-white">{selectedUserStats.totalLicenses}</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">{t('active') || 'Active'}</p>
                  <p className="text-xl font-bold text-emerald-400">{selectedUserStats.activeLicenses}</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">{t('unpaid') || 'Unpaid'}</p>
                  <p className="text-xl font-bold text-yellow-400">{selectedUserStats.unpaidLicenses}</p>
                </div>
                {isSuperAdmin && (
                  <div className="bg-zinc-900/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">{t('revenue') || 'Revenue'}</p>
                    <p className="text-xl font-bold text-green-400">
                      ${selectedUserStats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
