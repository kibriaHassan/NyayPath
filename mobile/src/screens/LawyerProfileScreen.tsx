import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppCard } from '../components/ui/AppCard'
import { Avatar } from '../components/ui/Avatar'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { StatusPill } from '../components/ui/MenuRow'
import { api } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Lawyer = {
  id: string
  fullName: string
  district?: string
  court?: string
  practiceType?: string
  yearsOfExperience?: number
  photo?: string
  verified?: boolean
  chamberName?: string
  bio?: string
  barAssociation?: string
  mobile?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'LawyerProfile'>

export function LawyerProfileScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const preview = route.params.preview as Lawyer | undefined
  const [lawyer, setLawyer] = useState<Lawyer | null>(
    preview || { id: route.params.id, fullName: '' },
  )

  useEffect(() => {
    let alive = true
    // Prefer single-lawyer endpoint; fall back to list
    api<{ data: Lawyer }>(`/lawyers/${route.params.id}`, { auth: false })
      .then((res) => {
        if (alive && res.data) setLawyer(res.data)
      })
      .catch(() => {
        api<{ data: Lawyer[] }>('/lawyers', { auth: false })
          .then((res) => {
            const found = (res.data || []).find((x) => x.id === route.params.id)
            if (alive && found) setLawyer(found)
          })
          .catch(() => {})
      })
    return () => {
      alive = false
    }
  }, [route.params.id])

  return (
    <Screen>
      <ScreenHeader
        title={t('lawyer')}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack()
          else navigation.navigate('PublicTabs', { screen: 'Lawyers' })
        }}
      />
      <AppCard style={{ alignItems: 'center' }}>
        <Avatar uri={lawyer?.photo} name={lawyer?.fullName} size={96} radius={32} />
        <Text
          style={{
            color: c.text,
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          {lawyer?.fullName || '—'}
        </Text>
        {lawyer?.verified ? <StatusPill label={t('verified')} tone="success" /> : null}
        {lawyer?.bio ? (
          <Text style={{ color: c.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
            {lawyer.bio}
          </Text>
        ) : null}
        <View style={{ width: '100%', marginTop: 18, gap: 10 }}>
          <Info label={t('district')} value={lawyer?.district || '—'} c={c} />
          <Info label={t('court')} value={lawyer?.court || '—'} c={c} />
          <Info label={t('chamber')} value={lawyer?.chamberName || '—'} c={c} />
          <Info label={t('barAssociation')} value={lawyer?.barAssociation || '—'} c={c} />
          <Info label={t('mobile')} value={lawyer?.mobile || '—'} c={c} />
          <Info
            label={t('experience')}
            value={`${lawyer?.yearsOfExperience || 0} ${t('years')}`}
            c={c}
          />
        </View>
      </AppCard>
    </Screen>
  )
}

function Info({
  label,
  value,
  c,
}: {
  label: string
  value: string
  c: ReturnType<ReturnType<typeof useSettingsStore.getState>['colors']>
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: c.textMuted }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '700', maxWidth: '60%', textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  )
}
