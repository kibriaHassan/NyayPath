import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { DateField } from '../components/ui/DateField'
import { SelectField } from '../components/ui/SelectField'
import { StatusPill } from '../components/ui/MenuRow'
import { SuccessToast } from '../components/ui/SuccessToast'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api, ApiError } from '../api/client'
import { useStaffPerms } from '../hooks/useStaffPerms'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import { HEARING_PURPOSE_OPTIONS } from '../utils/courtCalendar'
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
  nextHearingPurpose?: string
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
  const [customPurpose, setCustomPurpose] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<'success' | 'already' | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [savingHearing, setSavingHearing] = useState(false)
  const [showPastForm, setShowPastForm] = useState(false)
  const [pastDate, setPastDate] = useState('')
  const [pastPurpose, setPastPurpose] = useState('')
  const [pastCustomPurpose, setPastCustomPurpose] = useState('')
  const [pastNotes, setPastNotes] = useState('')
  const [savingPast, setSavingPast] = useState(false)
  const { allow, isStaff } = useStaffPerms()
  const isLawyer = user?.role === 'LAWYER'
  const canEditCase = allow('editCases')
  const canHearing = allow('editHearingDates') || allow('editCases')
  const canNotes = isStaff && allow('addNotes')

  useEffect(() => {
    const apply = (data: CaseData) => {
      setItem(data)
      setHearingDate(data.nextHearingDate || '')
      const p = data.nextHearingPurpose || ''
      if (p && !HEARING_PURPOSE_OPTIONS.some((o) => o.value === p)) {
        setPurpose('অন্যান্য')
        setCustomPurpose(p)
      } else {
        setPurpose(p)
        setCustomPurpose('')
      }
      setNote(data.importantNotes || '')
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
    const purposeValue = purpose === 'অন্যান্য' ? customPurpose.trim() : purpose.trim()
    const nextDate = hearingDate.trim().slice(0, 10)
    if (!nextDate || !purposeValue) {
      Alert.alert(t('error'), 'পরবর্তী তারিখ এবং সেদিন কী হবে — দুটোই দিন')
      return
    }
    const currentNext = String(item.nextHearingDate || '').slice(0, 10)
    const currentPurpose = String(item.nextHearingPurpose || '').trim()
    if (currentNext && currentNext === nextDate && currentPurpose === purposeValue) {
      setToast('already')
      return
    }
    if (savingHearing) return
    setSavingHearing(true)
    try {
      const res = await api<{ data: CaseData }>(`/cases/${item.id}/next-hearing`, {
        method: 'PATCH',
        body: { nextHearingDate: nextDate, nextHearingPurpose: purposeValue },
      })
      setItem((prev) => ({
        ...prev,
        ...res.data,
        nextHearingDate: res.data.nextHearingDate || nextDate,
        nextHearingPurpose: res.data.nextHearingPurpose || purposeValue,
      }))
      setHearingDate(res.data.nextHearingDate || nextDate)
      if (res.data.nextHearingPurpose) {
        const p = res.data.nextHearingPurpose
        if (!HEARING_PURPOSE_OPTIONS.some((o) => o.value === p)) {
          setPurpose('অন্যান্য')
          setCustomPurpose(p)
        } else {
          setPurpose(p)
          setCustomPurpose('')
        }
      }
      setToastMessage(t('hearingSaved'))
      setToast('success')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'HEARING_ALREADY_ENTERED') {
        setToast('already')
      } else {
        Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
      }
    } finally {
      setSavingHearing(false)
    }
  }

  const savePastHearing = async () => {
    if (!isLawyer) return
    const purposeValue = pastPurpose === 'অন্যান্য' ? pastCustomPurpose.trim() : pastPurpose.trim()
    const day = pastDate.trim().slice(0, 10)
    if (!day || !purposeValue) {
      Alert.alert(t('error'), 'পুরাতন তারিখ এবং সেদিন কী হয়েছিল — দুটোই দিন')
      return
    }
    const filing = String(item.filingDate || '').slice(0, 10)
    if (filing && day <= filing) {
      Alert.alert(
        t('error'),
        day === filing
          ? 'দাখিলের তারিখ আলাদাভাবে আছে — পুরাতন শুনানি হিসেবে আবার এন্ট্রি করা যাবে না।'
          : 'দাখিলের তারিখের আগের শুনানি এন্ট্রি করা যায় না।',
      )
      return
    }
    if (savingPast) return
    setSavingPast(true)
    try {
      const res = await api<{ data: unknown; case: CaseData }>(`/cases/${item.id}/past-hearings`, {
        method: 'POST',
        body: {
          hearingDate: day,
          hearingType: purposeValue,
          notes: pastNotes.trim() || undefined,
        },
      })
      if (res.case) {
        setItem((prev) => ({ ...prev, ...res.case }))
      }
      setPastDate('')
      setPastPurpose('')
      setPastCustomPurpose('')
      setPastNotes('')
      setShowPastForm(false)
      setToastMessage(t('pastHearingSaved'))
      setToast('success')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'HEARING_ALREADY_ENTERED') {
        setToast('already')
      } else {
        Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
      }
    } finally {
      setSavingPast(false)
    }
  }

  return (
    <Screen>
      <SuccessToast
        visible={toast === 'success'}
        title="Success"
        message={toastMessage || t('hearingSaved')}
        variant="success"
        onDone={() => setToast(null)}
      />
      <SuccessToast
        visible={toast === 'already'}
        title={t('hearingAlreadyEntered')}
        message={t('hearingAlreadyHint')}
        variant="already"
        onDone={() => setToast(null)}
      />
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
          <Row label={t('filingDate')} value={item.filingDate || '—'} c={c} />
          <Row label={t('nextHearing')} value={item.nextHearingDate || '—'} c={c} />
          <Row label={t('judge')} value={item.judgeName || '—'} c={c} />
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

      <View style={{ gap: 10, marginTop: 14 }}>
        <AppButton
          title={t('hearingHistory')}
          variant="outline"
          fullWidth
          onPress={() =>
            navigation.navigate('CaseHearingHistory', {
              caseId: item.id,
              caseNumber: item.caseNumber,
              filingDate: item.filingDate,
              nextHearingDate: item.nextHearingDate,
              nextHearingPurpose: item.nextHearingPurpose,
              courtName: item.courtName,
            })
          }
        />
      </View>

      {isLawyer ? (
        <AppCard style={{ gap: 10, marginTop: 14 }}>
          <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>{t('pastHearingDate')}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>{t('addPastHearingHint')}</Text>
          <AppButton
            title={showPastForm ? t('close') : t('addPastHearing')}
            variant="outline"
            fullWidth
            onPress={() => setShowPastForm((v) => !v)}
          />
          {showPastForm ? (
            <>
              <DateField
                label={t('pastHearingDate')}
                value={pastDate}
                onChange={setPastDate}
                skipHolidays
                placeholder="YYYY-MM-DD"
              />
              <SelectField
                label={t('description')}
                value={pastPurpose}
                placeholder="সেদিন কী হয়েছিল"
                options={HEARING_PURPOSE_OPTIONS}
                onChange={(v) => {
                  setPastPurpose(v)
                  if (v !== 'অন্যান্য') setPastCustomPurpose('')
                }}
              />
              {pastPurpose === 'অন্যান্য' ? (
                <AppInput
                  label="অন্যান্য বিবরণ"
                  value={pastCustomPurpose}
                  onChangeText={setPastCustomPurpose}
                  placeholder="লিখুন"
                />
              ) : null}
              <AppInput
                label={t('importantNotes')}
                value={pastNotes}
                onChangeText={setPastNotes}
                placeholder="ঐচ্ছিক"
              />
              <AppButton
                title={savingPast ? t('loading') : t('save')}
                onPress={() => void savePastHearing()}
                disabled={savingPast}
                fullWidth
              />
            </>
          ) : null}
        </AppCard>
      ) : null}

      {canHearing || canEditCase || canNotes ? (
        <View style={{ gap: 10, marginTop: 14 }}>
          {canHearing ? (
            <AppCard style={{ gap: 10 }}>
              <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>
                পরবর্তী তারিখ আসা পর্যন্ত এডিট করা যাবে — নতুন তারিখ দিলে আগেরটি বদলে যাবে।
              </Text>
              <DateField
                label={t('nextHearing')}
                value={hearingDate}
                onChange={setHearingDate}
                clearOnFocus
                skipHolidays
                placeholder="YYYY-MM-DD"
              />
              <SelectField
                label={t('description')}
                value={purpose}
                placeholder="সেদিন কী হবে — রায়, আদেশ…"
                options={HEARING_PURPOSE_OPTIONS}
                onChange={(v) => {
                  setPurpose(v)
                  if (v !== 'অন্যান্য') setCustomPurpose('')
                }}
              />
              {purpose === 'অন্যান্য' ? (
                <AppInput
                  label="অন্যান্য বিবরণ"
                  value={customPurpose}
                  onChangeText={setCustomPurpose}
                  placeholder="লিখুন"
                />
              ) : null}
              <AppButton
                title={savingHearing ? t('loading') : t('updateHearing')}
                onPress={() => void updateHearing()}
                disabled={savingHearing}
                fullWidth
              />
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
