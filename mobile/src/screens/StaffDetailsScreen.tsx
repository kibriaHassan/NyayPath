import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppCard } from '../components/ui/AppCard'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { StatusPill } from '../components/ui/MenuRow'
import { api } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Staff = {
  id: string
  name: string
  email: string
  mobile?: string
  staffCode?: string
  role?: string
  active?: boolean
  permissions?: Record<string, boolean>
}

type Props = NativeStackScreenProps<RootStackParamList, 'StaffDetails'>

export function StaffDetailsScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const [staff, setStaff] = useState<Staff | null>((route.params.preview as Staff) || null)

  useEffect(() => {
    api<{ data: Staff }>(`/staff/${route.params.id}`)
      .then((res) => setStaff(res.data))
      .catch(() => {})
  }, [route.params.id])

  if (!staff) {
    return (
      <Screen>
        <ScreenHeader title={t('staff')} onBack={() => navigation.goBack()} />
        <Text style={{ color: c.textMuted }}>{t('loading')}</Text>
      </Screen>
    )
  }

  const perms = staff.permissions || {}

  return (
    <Screen>
      <ScreenHeader title={staff.name} onBack={() => navigation.goBack()} />
      <AppCard style={{ marginBottom: 12 }}>
        <Text style={{ color: c.primary, fontWeight: '800', fontFamily: 'monospace' }}>
          {staff.staffCode}
        </Text>
        <Text style={{ color: c.textMuted, marginTop: 6 }}>{staff.email}</Text>
        <Text style={{ color: c.textMuted, marginTop: 4 }}>{staff.mobile || '—'}</Text>
        <Text style={{ color: c.text, marginTop: 8, fontWeight: '700' }}>{staff.role}</Text>
        <StatusPill
          label={staff.active === false ? t('disabled') : t('active')}
          tone={staff.active === false ? 'danger' : 'success'}
        />
      </AppCard>
      <AppCard>
        <Text style={{ color: c.text, fontWeight: '800', marginBottom: 10 }}>{t('permissions')}</Text>
        {Object.keys(perms).length === 0 ? (
          <Text style={{ color: c.textMuted }}>{t('noData')}</Text>
        ) : (
          Object.entries(perms).map(([key, val]) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <Text style={{ color: c.text }}>{key}</Text>
              <Text style={{ color: val ? c.success : c.danger, fontWeight: '700' }}>
                {val ? '✓' : '✗'}
              </Text>
            </View>
          ))
        )}
      </AppCard>
    </Screen>
  )
}
