'use client'

import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Trash2, Shield, UserCheck } from 'lucide-react'
import type { Profile, UserRole } from '@/lib/types'
import { deleteUser, updateUserRole } from '@/lib/actions/users'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/language-context'

interface TeamTableProps {
  members: Profile[]
  currentUserRole: UserRole
}

export function TeamTable({ members, currentUserRole }: TeamTableProps) {
  const { t } = useLanguage()

  const handleDelete = async (member: Profile) => {
    if (!confirm(`Delete ${member.full_name || member.username}?`)) return

    const result = await deleteUser(member.id)
    if (result.success) {
      toast.success(t('userDeleted'))
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const handleChangeRole = async (member: Profile, newRole: 'admin' | 'user') => {
    const result = await updateUserRole(member.id, newRole)
    if (result.success) {
      toast.success(`${t('roleChanged')} ${newRole === 'admin' ? t('admin') : t('user')}`)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
            {t('superAdmin')}
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
            {t('admin')}
          </Badge>
        )
      case 'user':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
            {t('user')}
          </Badge>
        )
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400 font-semibold">{t('user')}</TableHead>
            <TableHead className="text-zinc-400 font-semibold">{t('email')}</TableHead>
            <TableHead className="text-zinc-400 font-semibold">{t('role')}</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Created</TableHead>
            <TableHead className="text-zinc-400 font-semibold text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                {t('noTeamMembers')}
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell>
                  <div>
                    <p className="font-medium text-white">{member.full_name || member.username}</p>
                    <p className="text-xs text-zinc-500">@{member.username}</p>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-300">{member.email}</TableCell>
                <TableCell>{getRoleBadge(member.role)}</TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {format(new Date(member.created_at), 'PP')}
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== 'super_admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 w-48">
                        {currentUserRole === 'super_admin' && (
                          <>
                            {member.role === 'user' && (
                              <DropdownMenuItem
                                onClick={() => handleChangeRole(member, 'admin')}
                                className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {t('makeAdmin')}
                              </DropdownMenuItem>
                            )}
                            {member.role === 'admin' && (
                              <DropdownMenuItem
                                onClick={() => handleChangeRole(member, 'user')}
                                className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {t('makeUser')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(member)}
                          className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
