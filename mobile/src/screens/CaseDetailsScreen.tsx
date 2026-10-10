import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api, ApiError } from '../api/client'
import { useStaffPerms } from '../hooks/useStaffPerms'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type CaseData = {
  id: string
  caseNumber?: string
  caseTitle?: string
  title?: string
  status?: string
  division?: string
  district?: string
  courtName?: string
  plaintiff?: string
  defendant?: string
  plaintiffLawyerName?: string
  defendantLawyerName?: string
  nextHearingDate?: string
  judgeName?: string
  description?: string
  filingDate?: string
  importantNotes?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetails'>

export function CaseDetailsScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const [item, setItem] = useState<CaseData>((route.params.preview as CaseData) || { id: route.params.id })
  const [loading, setLoading] = useState(true)
  const [hearingDate, setHearingDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [note, setNote] = useState('')
  const { allow, isStaff } = useStaffPerms()
  const isLawyer = user?.role === 'LAWYER'
  const canEditCase = allow('editCases')
  const canHearing = allow('editHearingDates') || allow('editCases')
  const canNotes = isStaff && allow('addNotes')

  useEffect(() => {
    const apply = (data: CaseData) => {
      setItem(data)
      setHearingDate(data.nextHearingDate || '')
    }
    const load = async () => {
      try {
        if (user) {
          const res = await api<{ data: CaseData }>(`/cases/${route.params.id}`)
          apply(res.data)
        } else {
          const res = await api<{ data: CaseData }>(
            `/cases/search/detail/${route.params.id}`,
            { auth: false },
          )
          apply(res.data)
        }
      } catch {
        if (user) {
          try {
            const res = await api<{ data: CaseData }>(
              `/cases/search/detail/${route.params.id}`,
              { auth: false },
            )
            apply(res.data)
          } catch {
            /* keep preview */
          }
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [route.params.id, user?.id])

  const saveNote = async () => {
    try {
      await api(`/cases/${item.id}`, { method: 'PUT', body: { importantNotes: note } })
      setItem((prev) => ({ ...prev, importantNotes: note }))
      Alert.alert(t('saved'))
    } catch (e) {
      Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
    }
  }

  const updateHearing = async () => {
    if (!hearingDate.trim() || !purpose.trim()) return
    try {
      await api(`/cases/${item.id}/next-hearing`, {
        method: 'PATCH',
        body: { nextHearingDate: hearingDate.trim(), nextHearingPurpose: purpose.trim() },
      })
      setItem((prev) => ({ ...prev, nextHearingDate: hearingDate.trim() }))
      Alert.alert(t('saved'))
    } catch (e) {
      Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
    }
  }

  const withdraw = () => {
    Alert.alert(t('withdrawCase'), item.caseNumber || '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('withdrawCase'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/cases/${item.id}/withdraw`, { method: 'POST' })
            navigation.goBack()
          } catch (e) {
            Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <ScreenHeader title={t('cases')} onBack={() => navigation.goBack()} />
      {loading ? <Text style={{ color: c.textMuted }}>{t('loading')}</Text> : null}
      <AppCard>
        <Text style={{ color: c.primary, fontWeight: '800', fontSize: 18 }}>
          {item.caseNumber || '—'}
        </Text>
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 20, marginTop: 8 }}>
          {item.caseTitle || item.title || '—'}
        </Text>
        {item.status ? <StatusPill label={item.status} /> : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          <Row label={t('plaintiff')} value={item.plaintiff || '—'} c={c} />
          <Row label={t('defendant')} value={item.defendant || '—'} c={c} />
          <Row label={t('court')} value={item.courtName || '—'} c={c} />
          <Row label={t('division')} value={item.division || '—'} c={c} />
          <Row label={t('district')} value={item.district || '—'} c={c} />
          <Row label={t('nextHearing')} value={item.nextHearingDate || '—'} c={c} />
          <Row label={t('judge')} value={item.judgeName || '—'} c={c} />
          <Row label={t('filingDate')} value={item.filingDate || '—'} c={c} />
          <Row label={`${t('lawyer')} (${t('plaintiffSide')})`} value={item.plaintiffLawyerName || '—'} c={c} />
          <Row label={`${t('lawyer')} (${t('defendantSide')})`} value={item.defendantLawyerName || '—'} c={c} />
        </View>

        {item.description ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: c.textMuted }}>{t('description')}</Text>
            <Text style={{ color: c.text, marginTop: 4, lineHeight: 20 }}>{item.description}</Text>
          </View>
        ) : null}
      </AppCard>

      {canHearing || canEditCase || canNotes || isLawyer ? (
        <View style={{ gap: 10, marginTop: 14 }}>
          {canHearing ? (
            <AppCard style={{ gap: 10 }}>
              <AppInput
                label={`${t('nextHearing')} (YYYY-MM-DD)`}
                value={hearingDate}
                onChangeText={setHearingDate}
              />
              <AppInput label={t('description')} value={purpose} onChangeText={setPurpose} />
              <AppButton title={t('updateHearing')} onPress={updateHearing} fullWidth />
            </AppCard>
          ) : null}
          {canNotes ? (
            <AppCard style={{ gap: 10 }}>
              <AppInput label={t('importantNotes')} value={note} onChangeText={setNote} />
              <AppButton title={t('save')} onPress={() => void saveNote()} fullWidth />
            </AppCard>
          ) : null}
          {canEditCase ? (
            <AppButton
              title={t('editCase')}
              onPress={() =>
                navigation.navigate('CaseForm', {
                  mode: 'edit',
                  id: item.id,
                  preview: item,
                })
              }
              fullWidth
            />
          ) : null}
          {isLawyer ? (
            <AppButton title={t('withdrawCase')} variant="danger" onPress={withdraw} fullWidth />
          ) : null}
        </View>
      ) : null}
    </Screen>
  )
}

function Row({
  label,
  value,
  c,
}: {
  label: string
  value: string
  c: ReturnType<ReturnType<typeof useSettingsStore.getState>['colors']>
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: c.textMuted, flexShrink: 0 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '700', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}
