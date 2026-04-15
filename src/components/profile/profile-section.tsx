'use client'

import { useState, useEffect, useCallback } from 'react'
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
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Smartphone
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/language-context'
import { updateProfile, changePassword, updateTelegramSettings, sendTestTelegramMessage } from '@/lib/actions/profile'
import { Switch } from '@/components/ui/switch'

interface ConnectedTelegram {
  chat_id: string
  username?: string
  first_name?: string
}

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
  const [telegramEnabled, setTelegramEnabled] = useState(profile.telegram_enabled || false)
  const [savingTelegram, setSavingTelegram] = useState(false)

  // Connected Telegrams list
  const [connectedTelegrams, setConnectedTelegrams] = useState<ConnectedTelegram[]>([])
  const [loadingTelegrams, setLoadingTelegrams] = useState(false)

  // Link generation state
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkData, setLinkData] = useState<{
    code: string
    link: string
    linkId: string
    expiresAt: string
  } | null>(null)
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(false)

  // Admin alert filters
  const [adminAlertOnFail, setAdminAlertOnFail] = useState(profile.admin_alert_on_fail ?? true)
  const [adminAlertOnSuccess, setAdminAlertOnSuccess] = useState(profile.admin_alert_on_success ?? false)
  const [adminAlertIp, setAdminAlertIp] = useState(profile.admin_alert_ip ?? true)
  const [adminAlertGps, setAdminAlertGps] = useState(profile.admin_alert_gps ?? true)

  // Fetch connected Telegrams
  const fetchConnectedTelegrams = useCallback(async () => {
    setLoadingTelegrams(true)
    try {
      const res = await fetch(`/api/telegram/list?user_id=${profile.id}`)
      const data = await res.json()
      if (data.success) {
        setConnectedTelegrams(data.telegrams || [])
      }
    } catch (err) {
      console.error('Error fetching telegrams:', err)
    }
    setLoadingTelegrams(false)
  }, [profile.id])

  // Load connected Telegrams on mount
  useEffect(() => {
    fetchConnectedTelegrams()
  }, [fetchConnectedTelegrams])

  // Poll for link status when we have a pending link
  useEffect(() => {
    if (!linkData) return

    const checkStatus = async () => {
      setCheckingLinkStatus(true)
      try {
        const res = await fetch(`/api/telegram/status?link_id=${linkData.linkId}`)
        const data = await res.json()

        if (data.status === 'connected') {
          // Successfully connected!
          toast.success(lang === 'es' ? '¡Telegram conectado!' : 'Telegram connected!')
          setLinkData(null)
          fetchConnectedTelegrams()
          setTelegramEnabled(true)
        } else if (data.status === 'expired') {
          toast.error(lang === 'es' ? 'El código expiró' : 'Code expired')
          setLinkData(null)
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
      setCheckingLinkStatus(false)
    }

    // Check every 3 seconds
    const interval = setInterval(checkStatus, 3000)

    return () => clearInterval(interval)
  }, [linkData, fetchConnectedTelegrams, lang])

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
      telegram_chat_id: connectedTelegrams[0]?.chat_id || '',
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

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true)
    try {
      const res = await fetch('/api/telegram/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile.id }),
      })
      const data = await res.json()

      if (data.success) {
        setLinkData({
          code: data.code,
          link: data.link,
          linkId: data.link_id,
          expiresAt: data.expires_at,
        })
      } else {
        toast.error(data.error || 'Error generating link')
      }
    } catch (err) {
      toast.error('Error generating link')
    }
    setIsGeneratingLink(false)
  }

  const handleRemoveTelegram = async (chatId: string) => {
    try {
      const res = await fetch('/api/telegram/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile.id, chat_id: chatId }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(lang === 'es' ? 'Telegram eliminado' : 'Telegram removed')
        setConnectedTelegrams(prev => prev.filter(t => t.chat_id !== chatId))
        if (connectedTelegrams.length <= 1) {
          setTelegramEnabled(false)
        }
      } else {
        toast.error(data.error || 'Error removing')
      }
    } catch (err) {
      toast.error('Error removing')
    }
  }

  const handleSendTestMessage = async (chatId: string) => {
    const result = await sendTestTelegramMessage(chatId)
    if (result.success) {
      toast.success(lang === 'es' ? 'Mensaje enviado!' : 'Message sent!')
    } else {
      toast.error(result.error || t('errorOccurred'))
    }
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
                  {profile.trials_used_this_month || 0} / {profile.trial_limit && profile.trial_limit > 0 ? profile.trial_limit : (lang === 'es' ? 'Ilimitado' : 'Unlimited')}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                  <Key className="h-4 w-4" />
                  {t('trialsRemaining')}
                </div>
                <p className="text-3xl font-bold text-emerald-400">
                  {profile.trial_limit && profile.trial_limit > 0
                    ? Math.max(0, profile.trial_limit - (profile.trials_used_this_month || 0))
                    : (lang === 'es' ? 'Ilimitado' : 'Unlimited')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Telegram Notifications Card - NEW AUTO-LINK SYSTEM */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            Telegram Notifications
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {lang === 'es'
              ? 'Conecta tu Telegram para recibir alertas automáticamente'
              : 'Connect your Telegram to receive automatic alerts'}
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
                  {connectedTelegrams.length > 0
                    ? (lang === 'es' ? `${connectedTelegrams.length} Telegram(s) conectado(s)` : `${connectedTelegrams.length} Telegram(s) connected`)
                    : (lang === 'es' ? 'Conecta tu Telegram primero' : 'Connect your Telegram first')}
                </p>
              </div>
            </div>
            <Switch
              checked={telegramEnabled}
              onCheckedChange={setTelegramEnabled}
              disabled={connectedTelegrams.length === 0}
            />
          </div>

          {/* Connected Telegrams List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {lang === 'es' ? 'Telegrams Conectados' : 'Connected Telegrams'}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchConnectedTelegrams}
                disabled={loadingTelegrams}
                className="text-zinc-400 hover:text-white h-8"
              >
                <RefreshCw className={`h-3 w-3 ${loadingTelegrams ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {loadingTelegrams ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : connectedTelegrams.length > 0 ? (
              <div className="space-y-2">
                {connectedTelegrams.map((tg) => (
                  <div
                    key={tg.chat_id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Send className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {tg.username ? `@${tg.username}` : tg.first_name || 'Telegram User'}
                        </p>
                        <p className="text-xs text-zinc-500">ID: {tg.chat_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendTestMessage(tg.chat_id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2"
                        title={lang === 'es' ? 'Enviar mensaje de prueba' : 'Send test message'}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTelegram(tg.chat_id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700">
                <MessageCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">
                  {lang === 'es' ? 'No hay Telegrams conectados' : 'No Telegrams connected'}
                </p>
              </div>
            )}

            {/* Add Telegram Button / Link Generation */}
            {linkData ? (
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {checkingLinkStatus && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    <span className="text-sm text-blue-400">
                      {lang === 'es' ? 'Esperando conexión...' : 'Waiting for connection...'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLinkData(null)}
                    className="text-zinc-400 hover:text-white h-8"
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm text-zinc-300">
                    {lang === 'es'
                      ? 'Escanea el código QR o haz clic en el botón para conectar tu cuenta:'
                      : 'Scan the QR code or click the button to connect your account:'}
                  </p>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <QRCodeSVG
                        value={linkData.link}
                        size={180}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>

                  {/* Code Label */}
                  <p className="text-xs text-zinc-500">
                    {lang === 'es' ? 'Código:' : 'Code:'} <code className="text-blue-400 font-mono">{linkData.code}</code>
                  </p>

                  {/* Desktop Option */}
                  <div className="pt-2 border-t border-zinc-700/50">
                    <p className="text-xs text-zinc-500 mb-3 flex items-center justify-center gap-2">
                      <Smartphone className="h-3 w-3" />
                      {lang === 'es' ? 'O abre en la app de escritorio:' : 'Or open in desktop app:'}
                    </p>
                    <a
                      href={linkData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      {lang === 'es' ? 'Abrir Telegram Desktop' : 'Open Telegram Desktop'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
                variant="outline"
                className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {lang === 'es' ? 'Agregar Telegram' : 'Add Telegram'}
              </Button>
            )}

            <div className="text-xs text-zinc-500 p-3 bg-zinc-800/30 rounded-lg">
              <p className="font-medium text-zinc-400 mb-2">
                {lang === 'es' ? 'Cómo funciona:' : 'How it works:'}
              </p>
              <ol className="list-decimal list-inside space-y-1">
                {lang === 'es' ? (
                  <>
                    <li>Haz clic en "Agregar Telegram"</li>
                    <li>Se abrirá Telegram con el bot @geoalerts_bot</li>
                    <li>Presiona START en el bot</li>
                    <li>¡Listo! Tu cuenta quedará conectada automáticamente</li>
                  </>
                ) : (
                  <>
                    <li>Click "Add Telegram"</li>
                    <li>Telegram will open with the @geoalerts_bot</li>
                    <li>Press START in the bot</li>
                    <li>Done! Your account will be connected automatically</li>
                  </>
                )}
              </ol>
            </div>
          </div>

          {/* Admin Alert Filters */}
          {telegramEnabled && connectedTelegrams.length > 0 && (
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

          {/* Save Configuration Button - at the bottom */}
          <div className="pt-4 border-t border-zinc-800">
            <Button
              onClick={handleSaveTelegram}
              disabled={savingTelegram}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {savingTelegram ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {lang === 'es' ? 'Guardar Configuración' : 'Save Configuration'}
            </Button>
          </div>
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
