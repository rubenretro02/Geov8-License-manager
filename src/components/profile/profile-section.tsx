'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Key,
  Loader2,
  Check,
  Coins,
  FlaskConical,
  Edit3,
  Lock,
  Bell,
  Send,
  MessageCircle,
  Wifi,
  MapPin,
  XCircle,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/language-context'
import { updateProfile, changePassword, updateTelegramSettings, sendTestTelegramMessage } from '@/lib/actions/profile'
import { Switch } from '@/components/ui/switch'

interface ProfileSectionProps {
  profile: Profile
  user: SupabaseUser
}

export function ProfileSection({ profile, user }: ProfileSectionProps) {
  const { t, lang } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    username: profile.username || '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Telegram settings
  const [telegramChatId, setTelegramChatId] = useState(profile.telegram_chat_id || '')
  const [telegramEnabled, setTelegramEnabled] = useState(profile.telegram_enabled || false)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  // Admin alert filters
  const [adminAlertOnFail, setAdminAlertOnFail] = useState(profile.admin_alert_on_fail ?? true)
  const [adminAlertOnSuccess, setAdminAlertOnSuccess] = useState(profile.admin_alert_on_success ?? false)
  const [adminAlertIp, setAdminAlertIp] = useState(profile.admin_alert_ip ?? true)
  const [adminAlertGps, setAdminAlertGps] = useState(profile.admin_alert_gps ?? true)

  const handleSaveProfile = async () => {
    setLoading(true)
    const result = await updateProfile({
      full_name: formData.full_name,
      username: formData.username,
    })

    if (result.success) {
      toast.success(t('profileUpdated'))
      setIsEditing(false)
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('passwordsDoNotMatch'))
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t('password') + ' - min 6')
      return
    }

    setLoading(true)
    const result = await changePassword(passwordData.newPassword)

    if (result.success) {
      toast.success(t('passwordUpdated'))
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setLoading(false)
  }

  const handleSaveTelegram = async () => {
    setSavingTelegram(true)
    const result = await updateTelegramSettings({
      telegram_chat_id: telegramChatId,
      telegram_enabled: telegramEnabled,
      admin_alert_on_fail: adminAlertOnFail,
      admin_alert_on_success: adminAlertOnSuccess,
      admin_alert_ip: adminAlertIp,
      admin_alert_gps: adminAlertGps,
    })

    if (result.success) {
      toast.success(lang === 'es' ? 'Configuración guardada' : 'Settings saved')
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setSavingTelegram(false)
  }

  const handleSendTestMessage = async () => {
    if (!telegramChatId) {
      toast.error(lang === 'es' ? 'Ingresa tu Chat ID primero' : 'Enter your Chat ID first')
      return
    }
    setSendingTest(true)
    const result = await sendTestTelegramMessage(telegramChatId)

    if (result.success) {
      toast.success(lang === 'es' ? 'Mensaje enviado!' : 'Message sent!')
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
    setSendingTest(false)
  }

  const getRoleBadge = () => {
    switch (profile.role) {
      case 'super_admin':
        return (
          <Badge className="bg-violet-500/20 text-violet-400 text-sm px-3 py-1">
            <Shield className="w-4 h-4 mr-1" />
            {t('superAdmin')}
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 text-sm px-3 py-1">
            <Shield className="w-4 h-4 mr-1" />
            {t('admin')}
          </Badge>
        )
      case 'user':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1">
            <User className="w-4 h-4 mr-1" />
            {t('user')}
          </Badge>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('profileTitle')}</h1>
        <p className="text-zinc-400 mt-1">{t('profileSubtitle')}</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-zinc-700">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-2xl font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-white text-xl">
                  {profile.full_name || profile.username}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  @{profile.username}
                </CardDescription>
                <div className="mt-2">
                  {getRoleBadge()}
                </div>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {t('edit')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">{t('fullName')}</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">{t('username')}</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {t('save')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      full_name: profile.full_name || '',
                      username: profile.username || '',
                    })
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Mail className="h-4 w-4" />
                  {t('email')}
                </div>
                <p className="text-white font-medium">{profile.email}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <User className="h-4 w-4" />
                  {t('username')}
                </div>
                <p className="text-white font-medium">@{profile.username}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  {t('memberSince')}
                </div>
                <p className="text-white font-medium">
                  {format(new Date(profile.created_at), 'dd MMM yyyy')}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Shield className="h-4 w-4" />
                  {t('role')}
                </div>
                <p className="text-white font-medium capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credits Card (for admins) */}
      {profile.role === 'admin' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              {t('creditsAndLimits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                  <Coins className="h-4 w-4" />
                  {t('availableCredits')}
                </div>
                <p className="text-3xl font-bold text-amber-400">{profile.credits || 0}</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                  <FlaskConical className="h-4 w-4" />
                  {t('trialsUsedThisMonth')}
                </div>
                <p className="text-3xl font-bold text-purple-400">
                  {profile.trials_used_this_month || 0} / {profile.trial_limit || 0}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                  <Key className="h-4 w-4" />
                  {t('trialsRemaining')}
                </div>
                <p className="text-3xl font-bold text-emerald-400">
                  {(profile.trial_limit || 0) - (profile.trials_used_this_month || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Telegram Notifications Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            Telegram Notifications
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {lang === 'es'
              ? 'Recibe alertas de tus licencias en Telegram'
              : 'Receive license alerts on Telegram'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">
                  {lang === 'es' ? 'Activar Notificaciones' : 'Enable Notifications'}
                </p>
                <p className="text-xs text-zinc-500">
                  {lang === 'es'
                    ? 'Recibir alertas cuando un check falle'
                    : 'Receive alerts when a check fails'}
                </p>
              </div>
            </div>
            <Switch
              checked={telegramEnabled}
              onCheckedChange={setTelegramEnabled}
            />
          </div>

          {/* Chat ID Input */}
          <div className="space-y-3">
            <Label className="text-zinc-300 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat ID
            </Label>
            <div className="flex gap-2">
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="123456789"
                className="bg-zinc-800 border-zinc-700 text-white flex-1"
              />
              <Button
                onClick={handleSaveTelegram}
                disabled={savingTelegram}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {savingTelegram ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Test Button */}
            <Button
              onClick={handleSendTestMessage}
              disabled={sendingTest || !telegramChatId}
              variant="outline"
              className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {lang === 'es' ? 'Enviar Mensaje de Prueba' : 'Send Test Message'}
            </Button>

            <p className="text-xs text-zinc-500">
              {lang === 'es' ? (
                <>
                  Para obtener tu Chat ID:
                  <br />1. Abre Telegram y busca @userinfobot
                  <br />2. Envía /start y te dará tu ID
                </>
              ) : (
                <>
                  To get your Chat ID:
                  <br />1. Open Telegram and search @userinfobot
                  <br />2. Send /start and it will give you your ID
                </>
              )}
            </p>
          </div>

          {/* Admin Alert Filters */}
          {telegramEnabled && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Bell className="h-4 w-4" />
                {lang === 'es' ? 'Filtros de Alerta (qué alertas recibir)' : 'Alert Filters (what alerts to receive)'}
              </div>

              {/* Error Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">
                      {lang === 'es' ? 'Errores de IP' : 'IP Errors'}
                    </span>
                  </div>
                  <Switch
                    checked={adminAlertIp}
                    onCheckedChange={setAdminAlertIp}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-white">
                      {lang === 'es' ? 'Errores de GPS' : 'GPS Errors'}
                    </span>
                  </div>
                  <Switch
                    checked={adminAlertGps}
                    onCheckedChange={setAdminAlertGps}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-white">
                      {lang === 'es' ? 'Check Falla' : 'Check Fails'}
                    </span>
                  </div>
                  <Switch
                    checked={adminAlertOnFail}
                    onCheckedChange={setAdminAlertOnFail}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-white">
                      {lang === 'es' ? 'Check Exitoso' : 'Check Succeeds'}
                    </span>
                  </div>
                  <Switch
                    checked={adminAlertOnSuccess}
                    onCheckedChange={setAdminAlertOnSuccess}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                {lang === 'es'
                  ? 'Estos filtros se aplican a TODAS tus licencias monitoreadas. Cada licencia también tiene sus propios filtros.'
                  : 'These filters apply to ALL your monitored licenses. Each license also has its own filters.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-400" />
            {t('security')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-zinc-300">{t('newPassword')}</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Min 6"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">{t('confirmPassword')}</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {t('changePassword')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{t('password')}</p>
                <p className="text-zinc-500 text-sm">{t('lastUpdate')}: {t('unknown')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Key className="h-4 w-4 mr-2" />
                {t('changePassword')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
