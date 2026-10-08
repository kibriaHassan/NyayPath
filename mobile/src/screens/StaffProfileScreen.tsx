import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { Avatar } from '../components/ui/Avatar'
import { SuccessToast } from '../components/ui/SuccessToast'
import { StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import { pickProfilePhoto } from '../utils/pickProfilePhoto'
import type { RootStackParamList, StaffTabParamList } from '../navigation/types'

type StaffMe = {
  name: string
  email: string
  mobile?: string
  staffCode?: string
  role?: string
  active?: boolean
  lawyerId?: string
  lawyerName?: string
  photo?: string
  permissions?: Record<string, boolean>
}

type Props =
  | BottomTabScreenProps<StaffTabParamList, 'Profile'>
  | NativeStackScreenProps<RootStackParamList, 'StaffProfile'>

export function StaffProfileScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const [staff, setStaff] = useState<StaffMe | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [photo, setPhoto] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [success, setSuccess] = useState(false)
  const draftRef = useRef({ name: '', mobile: '', photo: '' })

  const load = () => {
    api<{ data: StaffMe }>('/staff/me')
      .then((res) => {
        setStaff(res.data)
        setName(res.data.name || '')
        setMobile(res.data.mobile || '')
        setPhoto(res.data.photo || user?.photo || '')
        updateUser({
          name: res.data.name,
          photo: res.data.photo,
          active: res.data.active !== false,
          lawyerId: res.data.lawyerId || '',
          staffCode: res.data.staffCode,
        })
      })
      .catch(() =>
        setStaff({
          name: user?.name || '',
          email: user?.email || '',
          staffCode: user?.staffCode,
          active: user?.active !== false,
          lawyerId: user?.lawyerId,
          photo: user?.photo,
        }),
      )
  }

  useEffect(() => {
    load()
  }, [user?.id])

  const leave = () => {
    Alert.alert(t('leaveLawyer'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leaveLawyer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/staff/me/leave', { method: 'POST' })
            updateUser({ lawyerId: '', active: false })
            load()
          } catch (e) {
            updateUser({ lawyerId: '', active: false })
            Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
            load()
          }
        },
      },
    ])
  }

  const choosePhoto = async () => {
    setPhotoError('')
    const picked = await pickProfilePhoto()
    if (!picked.ok) {
      if (!picked.cancelled && picked.error) setPhotoError(picked.error)
      return
    }
    setPhoto(picked.dataUrl)
  }

  const saveProfile = async () => {
    setSaving(true)
    setPhotoError('')
    try {
      const res = await api<{ data: StaffMe }>('/staff/me', {
        method: 'PUT',
        body: { name: name.trim(), mobile: mobile.trim(), photo },
      })
      setStaff((prev) => ({ ...(prev || res.data), ...res.data, name, mobile, photo }))
      updateUser({ name: name.trim(), photo })
      setEditing(false)
      setSuccess(true)
    } catch (e) {
      setPhotoError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  const disabled = staff?.active === false
  const linked = Boolean(staff?.lawyerId)
  const perms = staff?.permissions || {}

  return (
    <Screen>
      <SuccessToast
        visible={success}
        title="Success"
        message="Profile saved successfully."
        onDone={() => setSuccess(false)}
      />
      <ScreenHeader
        title={t('profile')}
        onBack={'goBack' in navigation ? () => (navigation as { goBack: () => void }).goBack() : undefined}
        right={
          editing ? undefined : (
            <Pressable
              onPress={() => {
                draftRef.current = { name, mobile, photo }
                setPhotoError('')
                setEditing(true)
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: c.primary,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('editProfile')}</Text>
            </Pressable>
          )
        }
      />
      <AppCard style={{ alignItems: 'center' }}>
        <Avatar uri={photo || staff?.photo || user?.photo} name={name || user?.name} size={88} radius={28} />
        {editing ? (
          <AppButton title={t('pickPhoto')} onPress={() => void choosePhoto()} style={{ marginTop: 12 }} />
        ) : null}
        {photoError ? (
          <Text style={{ color: c.danger, fontWeight: '700', marginTop: 8 }}>{photoError}</Text>
        ) : null}
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 20, marginTop: 12 }}>
          {name || user?.name}
        </Text>
        <Text style={{ color: c.primary, fontWeight: '700', marginTop: 4 }}>{staff?.staffCode}</Text>
        <Text style={{ color: c.textMuted, marginTop: 6 }}>{staff?.email}</Text>
        <StatusPill
          label={disabled ? t('disabled') : t('active')}
          tone={disabled ? 'danger' : 'success'}
        />
      </AppCard>

      {disabled ? (
        <AppCard style={{ marginTop: 14, borderColor: c.danger }}>
          <Text style={{ color: c.danger, fontWeight: '800' }}>{t('accountBlocked')}</Text>
          <Text style={{ color: c.textMuted, marginTop: 6 }}>{t('accountBlockedHint')}</Text>
        </AppCard>
      ) : null}

      <AppCard style={{ marginTop: 14 }}>
        <Text style={{ color: c.textMuted }}>{t('linkedLawyer')}</Text>
        <Text style={{ color: c.text, fontWeight: '800', marginTop: 4 }}>
          {linked ? staff?.lawyerName || staff?.lawyerId : '—'}
        </Text>
        {editing ? (
          <>
            <AppInput label={t('fullName')} value={name} onChangeText={setName} />
            <AppInput label={t('mobile')} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={t('cancel')}
                  variant="outline"
                  fullWidth
                  onPress={() => {
                    setName(draftRef.current.name)
                    setMobile(draftRef.current.mobile)
                    setPhoto(draftRef.current.photo)
                    setPhotoError('')
                    setEditing(false)
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={saving ? t('loading') : t('save')}
                  onPress={() => void saveProfile()}
                  disabled={saving}
                  fullWidth
                />
              </View>
            </View>
          </>
        ) : (
          <Text style={{ color: c.text, marginTop: 8 }}>{mobile || '—'}</Text>
        )}
      </AppCard>

      <AppCard style={{ marginTop: 14 }}>
        <Text style={{ color: c.text, fontWeight: '800', marginBottom: 8 }}>{t('permissions')}</Text>
        {Object.keys(perms).length === 0 ? (
          <Text style={{ color: c.textMuted }}>{t('noData')}</Text>
        ) : (
          Object.entries(perms).map(([k, v]) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <Text style={{ color: c.text }}>{k}</Text>
              <Text style={{ color: v ? c.success : c.danger, fontWeight: '700' }}>{v ? '✓' : '✗'}</Text>
            </View>
          ))
        )}
      </AppCard>

      {linked ? (
        <AppCard style={{ marginTop: 14 }}>
          <Text style={{ color: c.text, fontWeight: '800' }}>{t('leaveLawyer')}</Text>
          <Text style={{ color: c.textMuted, marginTop: 6, marginBottom: 12 }}>
            {t('leaveLawyer')}
          </Text>
          <AppButton title={t('leaveLawyer')} variant="outline" onPress={leave} fullWidth />
        </AppCard>
      ) : null}

      <AppCard style={{ marginTop: 14 }}>
        <AppButton
          title={t('logout')}
          variant="danger"
          fullWidth
          onPress={() => {
            Alert.alert(t('logout'), t('confirmLogout'), [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('logout'),
                style: 'destructive',
                onPress: () => {
                  void logout()
                },
              },
            ])
          }}
        />
      </AppCard>
    </Screen>
  )
}
