import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { DateField } from '../components/ui/DateField'
import { SuccessToast } from '../components/ui/SuccessToast'
import { BdLocationFilters } from '../components/search/BdLocationFilters'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SelectField } from '../components/ui/SelectField'
import { api, ApiError } from '../api/client'
import {
  EMPTY_LOCATION,
  caseNumberHint,
  normalizeCaseNumber,
  toAsciiCaseNumberInput,
  type BdLocationFilterValues,
} from '../data/locations'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'CaseForm'>
type Side = 'plaintiff' | 'defendant'

type StaffRow = { id: string; name: string; staffCode?: string; active?: boolean }

type MatchPreview = {
  id: string
  caseNumber: string
  caseTitle: string
  plaintiff: string
  defendant: string
  plaintiffLawyerName?: string
  defendantLawyerName?: string
}

const CASE_TYPES = ['সিভিল স্যুট', 'ফৌজদারি', 'পারিবারিক', 'কর্পোরেট', 'জমি জমা']
const CASE_STATUSES = ['Active', 'Pending', 'Hearing Scheduled', 'Disposed', 'Closed']

export function CaseFormScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const mode = route.params?.mode || 'create'
  const caseId = route.params?.id
  const initial = route.params?.preview || {}

  const [caseNumber, setCaseNumber] = useState(String(initial.caseNumber || ''))
  const [caseTitle, setCaseTitle] = useState(String(initial.caseTitle || initial.title || ''))
  const [caseType, setCaseType] = useState(String(initial.caseType || 'সিভিল স্যুট'))
  const [status, setStatus] = useState(String(initial.status || 'Active'))
  const [loc, setLoc] = useState<BdLocationFilterValues>({
    ...EMPTY_LOCATION,
    division: String(initial.division || ''),
    district: String(initial.district || initial.courtLocation || ''),
    courtType: String(initial.courtType || ''),
    court: String(initial.courtName || ''),
  })
  const [filingDate, setFilingDate] = useState(String(initial.filingDate || ''))
  const [nextHearingDate, setNextHearingDate] = useState(String(initial.nextHearingDate || ''))
  const [plaintiff, setPlaintiff] = useState(String(initial.plaintiff || ''))
  const [defendant, setDefendant] = useState(String(initial.defendant || ''))
  const [side, setSide] = useState<Side | ''>('')
  const [judgeName, setJudgeName] = useState(String(initial.judgeName || ''))
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const [description, setDescription] = useState(String(initial.description || ''))
  const [importantNotes, setImportantNotes] = useState(String(initial.importantNotes || ''))
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [match, setMatch] = useState<MatchPreview | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successVisible, setSuccessVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Case saved successfully.')
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  const finishSuccess = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setSuccessVisible(false)
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    api<{ data: StaffRow[] }>('/staff')
      .then((res) => setStaff((res.data || []).filter((s) => s.active !== false)))
      .catch(() => setStaff([]))
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !caseId) return
    api<{ data: Record<string, unknown> }>(`/cases/${caseId}`)
      .then((res) => {
        const row = res.data || {}
        const district = String(row.district || row.courtLocation || '')
        const representing =
          (row.representingSide as Side | undefined) ||
          (row.plaintiffLawyerId === user?.id
            ? 'plaintiff'
            : row.defendantLawyerId === user?.id
              ? 'defendant'
              : '')
        setCaseNumber(String(row.caseNumber || ''))
        setCaseTitle(String(row.caseTitle || ''))
        setCaseType(String(row.caseType || 'সিভিল স্যুট'))
        setStatus(String(row.status || 'Active'))
        setLoc({
          division: String(row.division || ''),
          district,
          courtType: String(row.courtType || ''),
          court: String(row.courtName || ''),
        })
        setFilingDate(String(row.filingDate || ''))
        setNextHearingDate(String(row.nextHearingDate || ''))
        setPlaintiff(String(row.plaintiff || ''))
        setDefendant(String(row.defendant || ''))
        setSide(representing || '')
        setJudgeName(String(row.judgeName || ''))
        const ids = (row.assignedStaffIds as string[] | undefined) || []
        setAssignedStaffId(ids[0] || '')
        setDescription(String(row.description || ''))
        setImportantNotes(String(row.importantNotes || ''))
      })
      .catch(() => {})
  }, [mode, caseId, user?.id])

  useEffect(() => {
    if (mode === 'edit') return
    const num = normalizeCaseNumber(caseNumber)
    if (!num.ok || !loc.division || !loc.district || !loc.court) {
      setMatch(null)
      return
    }
    let cancelled = false
    const qs = new URLSearchParams({
      q: num.value,
      division: loc.division,
      district: loc.district,
      court: loc.court,
    })
    api<{ data: MatchPreview | null }>(`/cases/match?${qs}`)
      .then((res) => {
        if (cancelled) return
        const m = res.data
        setMatch(m)
        if (!m) return
        setCaseTitle((prev) => prev || m.caseTitle || '')
        setPlaintiff((prev) => prev || m.plaintiff || '')
        setDefendant((prev) => prev || m.defendant || '')
      })
      .catch(() => {
        if (!cancelled) setMatch(null)
      })
    return () => {
      cancelled = true
    }
  }, [mode, caseNumber, loc.division, loc.district, loc.court])

  const opposite =
    match && side
      ? side === 'plaintiff'
        ? match.defendantLawyerName
          ? { name: match.defendantLawyerName, label: t('defendantSide') }
          : null
        : match.plaintiffLawyerName
          ? { name: match.plaintiffLawyerName, label: t('plaintiffSide') }
          : null
      : null

  const validate = useCallback((): string | null => {
    const num = normalizeCaseNumber(caseNumber)
    if (!num.ok) return num.error
    if (!caseTitle.trim()) return t('needCaseTitle')
    if (!caseType.trim()) return t('needCaseType')
    if (!loc.division || !loc.district || !loc.courtType || !loc.court.trim()) {
      return t('needLocationAll')
    }
    if (!filingDate.trim() || !nextHearingDate.trim()) return t('needDates')
    if (!plaintiff.trim() || !defendant.trim()) return t('needParties')
    if (!side) return t('needSide')
    return null
  }, [
    caseNumber,
    caseTitle,
    caseType,
    loc,
    filingDate,
    nextHearingDate,
    plaintiff,
    defendant,
    side,
    t,
  ])

  const save = async () => {
    setFormError('')
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    const num = normalizeCaseNumber(caseNumber)
    if (!num.ok || !side) return

    setSaving(true)
    try {
      const myName = user?.name || ''
      const body = {
        caseNumber: num.value,
        caseTitle: caseTitle.trim(),
        caseType,
        status,
        division: loc.division,
        district: loc.district,
        courtType: loc.courtType,
        courtName: loc.court.trim(),
        courtLocation: loc.district,
        filingDate: filingDate.trim(),
        nextHearingDate: nextHearingDate.trim(),
        plaintiff: plaintiff.trim(),
        defendant: defendant.trim(),
        representingSide: side,
        plaintiffLawyerName: side === 'plaintiff' ? myName : '',
        defendantLawyerName: side === 'defendant' ? myName : '',
        plaintiffLawyerId: side === 'plaintiff' ? user?.id : undefined,
        defendantLawyerId: side === 'defendant' ? user?.id : undefined,
        judgeName: judgeName.trim(),
        description: description.trim(),
        importantNotes: importantNotes.trim(),
        assignedStaffIds: assignedStaffId ? [assignedStaffId] : [],
      }
      if (mode === 'edit' && caseId) {
        await api(`/cases/${caseId}`, { method: 'PUT', body })
        setSuccessMessage('Case updated successfully.')
      } else {
        const res = await api<{ merged?: boolean; message?: string }>('/cases', {
          method: 'POST',
          body,
        })
        setSuccessMessage(
          res.merged ? 'Joined existing case successfully.' : 'Case saved successfully.',
        )
      }
      setSuccessVisible(true)
      leaveTimer.current = setTimeout(() => {
        finishSuccess()
      }, 1400)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('error')
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  const numberHint = caseNumberHint(caseNumber)
  const numberOk = normalizeCaseNumber(caseNumber).ok

  return (
    <Screen>
      <SuccessToast
        visible={successVisible}
        title="Success"
        message={successMessage}
        onDone={finishSuccess}
      />
      <ScreenHeader
        title={mode === 'edit' ? t('editCase') : t('addCase')}
        subtitle={t('caseFormHint')}
        onBack={() => navigation.goBack()}
      />

      <View style={{ gap: 12 }}>
        <AppCard style={{ gap: 12 }}>
          <AppInput
            label={t('caseNumber')}
            required
            value={caseNumber}
            onChangeText={(text) => setCaseNumber(toAsciiCaseNumberInput(text))}
            onBlur={() => {
              const n = normalizeCaseNumber(caseNumber)
              if (n.ok) setCaseNumber(n.value)
            }}
            placeholder="123/2026"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={{ color: numberOk ? c.success : c.textMuted, fontSize: 12, marginTop: -4 }}>
            {numberHint}
          </Text>

          <AppInput
            label={t('caseTitle')}
            required
            value={caseTitle}
            onChangeText={setCaseTitle}
          />

          <SelectField
            label={t('caseType')}
            required
            value={caseType}
            options={CASE_TYPES.map((v) => ({ value: v, label: v }))}
            onChange={setCaseType}
          />

          <SelectField
            label={t('status')}
            value={status}
            options={CASE_STATUSES.map((v) => ({ value: v, label: v }))}
            onChange={setStatus}
          />

          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginTop: 4 }}>
            {t('locationBlock')}
            <Text style={{ color: c.danger }}> *</Text>
          </Text>
          <BdLocationFilters mode="entry" value={loc} onChange={setLoc} />

          {match ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: c.primary,
                backgroundColor: c.primarySoft,
                borderRadius: 14,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: c.text, fontWeight: '800' }}>{t('caseAlreadyExists')}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>
                {match.caseNumber} — {match.caseTitle || '—'}
              </Text>
              <Text style={{ color: c.text, fontSize: 13 }}>
                {t('plaintiffSide')}: {match.plaintiffLawyerName || t('notYet')} ·{' '}
                {t('defendantSide')}: {match.defendantLawyerName || t('notYet')}
              </Text>
            </View>
          ) : null}

          <DateField
            label={t('filingDate')}
            required
            value={filingDate}
            onChange={setFilingDate}
            placeholder="2025-11-12"
          />
          <DateField
            label={t('nextHearing')}
            required
            value={nextHearingDate}
            onChange={setNextHearingDate}
            placeholder="2026-10-15"
          />

          <AppInput label={t('plaintiff')} required value={plaintiff} onChangeText={setPlaintiff} />
          <AppInput label={t('defendant')} required value={defendant} onChangeText={setDefendant} />

          <Text style={{ color: c.text, fontWeight: '700' }}>
            {t('representingSide')}
            <Text style={{ color: c.danger }}> *</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(
              [
                { key: 'plaintiff' as const, label: t('plaintiffSide'), hint: t('plaintiffSideHint') },
                { key: 'defendant' as const, label: t('defendantSide'), hint: t('defendantSideHint') },
              ] as const
            ).map((opt) => {
              const active = side === opt.key
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSide(opt.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: active ? c.primary : c.border,
                    backgroundColor: active ? c.primarySoft : c.card,
                  }}
                >
                  <Text style={{ color: active ? c.primary : c.text, fontWeight: '800' }}>
                    {opt.label}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>{opt.hint}</Text>
                </Pressable>
              )
            })}
          </View>
          {side ? (
            <Text style={{ color: c.textMuted, fontSize: 13 }}>
              {t('youAre')}: <Text style={{ color: c.primary, fontWeight: '700' }}>{user?.name}</Text>
              {' — '}
              {side === 'plaintiff' ? t('plaintiffSide') : t('defendantSide')}
              {opposite ? ` · ${t('oppositeSide')}: ${opposite.name}` : ''}
            </Text>
          ) : null}

          <AppInput label={t('judge')} value={judgeName} onChangeText={setJudgeName} />

          {staff.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.border,
                borderRadius: 14,
                padding: 12,
              }}
            >
              <Text style={{ color: c.text, fontWeight: '700' }}>{t('assignedStaff')}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>
                {t('noStaffHint')}
              </Text>
            </View>
          ) : (
            <SelectField
              label={t('assignedStaff')}
              value={assignedStaffId}
              placeholder={t('manageMyself')}
              options={staff.map((s) => ({
                value: s.id,
                label: `${s.name}${s.staffCode ? ` (${s.staffCode})` : ''}`,
              }))}
              onChange={setAssignedStaffId}
            />
          )}

          <AppInput
            label={t('description')}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={t('caseDescriptionHint')}
          />
          <AppInput
            label={t('importantNotes')}
            value={importantNotes}
            onChangeText={setImportantNotes}
            multiline
          />

          {formError ? (
            <Text style={{ color: c.danger, fontWeight: '700' }}>{formError}</Text>
          ) : null}

          <AppButton
            title={saving ? t('loading') : t('save')}
            onPress={() => void save()}
            disabled={saving}
            fullWidth
          />
          <AppButton
            title={t('cancel')}
            variant="outline"
            onPress={() => navigation.goBack()}
            disabled={saving}
            fullWidth
          />
        </AppCard>
      </View>
    </Screen>
  )
}
