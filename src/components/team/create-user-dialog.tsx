'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2, Check } from 'lucide-react'
import { createUser } from '@/lib/actions/users'
import { toast } from 'sonner'
import type { UserRole } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface CreateUserDialogProps {
  currentUserRole: UserRole
}

export function CreateUserDialog({ currentUserRole }: CreateUserDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    role: 'user' as 'admin' | 'user',
  })

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.username) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      toast.error('Por favor ingresa un email válido (ejemplo: usuario@dominio.com)')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    // Validate username
    if (formData.username.length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }

    setLoading(true)
    const result = await createUser(formData)

    if (result.success) {
      setSuccess(true)
      toast.success(t('userCreated'))
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 1500)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      username: '',
      full_name: '',
      role: 'user',
    })
    setSuccess(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          {currentUserRole === 'super_admin' ? t('newAdminUser') : t('newUser')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{t('createNewUser')}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {currentUserRole === 'super_admin'
              ? t('createAdminOrUser')
              : t('addUserToTeam')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-white font-medium">{t('userCreated')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">{t('email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">{t('password')} *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-300">{t('username')} *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="usuario123"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-zinc-300">{t('fullName')}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {currentUserRole === 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-zinc-300">{t('role')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="admin" className="text-white focus:bg-zinc-800">
                      {t('admin')} (Admin)
                    </SelectItem>
                    <SelectItem value="user" className="text-white focus:bg-zinc-800">
                      {t('user')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  {t('adminsCanCreateUsers')}
                </p>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-zinc-400 hover:text-white"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  t('createNewUser')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
