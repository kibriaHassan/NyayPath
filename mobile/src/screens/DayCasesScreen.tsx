import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRoute } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { RouteProp } from '@react-navigation/native'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { DateField } from '../components/ui/DateField'
import { EmptyState } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SelectField } from '../components/ui/SelectField'
import { AppMenuButton } from '../components/nav/AppDrawer'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import {
  HEARING_PURPOSE_OPTIONS,
  isCourtHoliday,
  parseDateKey,
  partitionDayCases,
  sortByNextHearing,
  type CaseHearingRow,
  type DayCaseFilter,
} from '../utils/courtCalendar'
import type { LawyerTabParamList, StaffTabParamList } from '../navigation/types'

type Props =
  | BottomTabScreenProps<LawyerTabParamList, 'DayCases'>
  | BottomTabScreenProps<StaffTabParamList, 'DayCases'>

export function DayCasesScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const route = useRoute<RouteProp<LawyerTabParamList, 'DayCases'>>()
  const initialFilter = route.params?.filter || 'today'

  const [list, setList] = useState<CaseHearingRow[]>([])
  const [filter, setFilter] = useState<DayCaseFilter>(initialFilter)
  const [nowTick, setNowTick] = useState(() => new Date())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState('')
  const [entryPurpose, setEntryPurpose] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (route.params?.filter) setFilter(route.params.filter)
  }, [route.params?.filter])

  // Midnight / day rollover — recompute buckets when local date changes
  useEffect(() => {
    const id = setInterval(() => {
      setNowTick((prev) => {
        const n = new Date()
        if (
          prev.getFullYear() !== n.getFullYear() ||
          prev.getMonth() !== n.getMonth() ||
          prev.getDate() !== n.getDate()
        ) {
          return n
        }
        return prev
      })
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await api<{ data: CaseHearingRow[] }>('/cases')
      setList(res.data || [])
    } catch {
      setList([])
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setNowTick(new Date())
      if (route.params?.filter) setFilter(route.params.filter)
      void load()
    }, [load, route.params?.filter]),
  )

  const parts = useMemo(() => partitionDayCases(list, nowTick), [list, nowTick])

  const visible = useMemo(() => {
    const rows =
      filter === 'today' ? parts.todayCases : filter === 'next' ? parts.nextCases : parts.pendingCases
    return sortByNextHearing(rows)
  }, [filter, parts])

  const subtitle =
    filter === 'today'
      ? parts.todayMeta.full
      : filter === 'next'
        ? parts.nextMeta.full
        : t('pendingEntryHint')

  const openCase = (item: CaseHearingRow) => {
    navigation.getParent()?.navigate('CaseDetails', { id: item.id, preview: item })
  }

  const startEntry = (item: CaseHearingRow) => {
    setExpandedId(item.id)
    setEntryDate('')
    setEntryPurpose('')
    setEntryNotes('')
    setFormError('')
  }

  const submitEntry = async (caseId: string) => {
    setFormError('')
    if (!entryDate.trim() || !entryPurpose.trim()) {
      setFormError(t('needDateAndPurpose'))
      return
    }
    try {
      if (isCourtHoliday(parseDateKey(entryDate))) {
        setFormError(t('courtHolidayError'))
        return
      }
    } catch {
      setFormError(t('needDateAndPurpose'))
      return
    }
    setSavingId(caseId)
    try {
      await api(`/cases/${caseId}/next-hearing`, {
        method: 'PATCH',
        body: {
          nextHearingDate: entryDate.trim(),
          nextHearingPurpose: entryPurpose.trim(),
          notes: entryNotes.trim() || undefined,
        },
      })
      setExpandedId(null)
      await load()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setSavingId(null)
    }
  }

  const chips: { key: DayCaseFilter; label: string; count: number; tone: string }[] = [
    { key: 'today', label: t('todayCases'), count: parts.todayCases.length, tone: c.warning },
    { key: 'next', label: t('nextDayCases'), count: parts.nextCases.length, tone: c.primary },
    { key: 'pending', label: t('pendingEntry'), count: parts.pendingCases.length, tone: c.danger },
  ]

  return (
    <Screen>
      <ScreenHeader title={t('dayCases')} subtitle={subtitle} leading={<AppMenuButton />} />

      <View style={styles.chipRow}>
        {chips.map((chip) => {
          const active = filter === chip.key
          return (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[
                styles.chip,
                {
                  borderColor: active ? chip.tone : c.border,
                  backgroundColor: active ? c.primarySoft : c.card,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? chip.tone : c.text,
                  fontWeight: '800',
                  fontSize: 13,
                }}
                numberOfLines={2}
              >
                {chip.label}
              </Text>
              <Text style={{ color: active ? chip.tone : c.textMuted, fontWeight: '800', marginTop: 4 }}>
                {chip.count}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {filter === 'pending' ? (
        <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
          {user?.role === 'STAFF' ? t('pendingEntryStaffHint') : t('pendingEntryLawyerHint')}
        </Text>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState text={t('emptyDayCases')} />
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map((item) => {
            const pending = filter === 'pending'
            const open = expandedId === item.id
            return (
              <AppCard key={item.id} style={{ gap: 8 }}>
                <Pressable onPress={() => openCase(item)}>
                  <Text style={{ color: c.primary, fontWeight: '800' }}>{item.caseNumber}</Text>
                  <Text style={{ color: c.text, fontWeight: '700', marginTop: 4 }}>
                    {item.caseTitle || item.title || '—'}
                  </Text>
                  <Text style={{ color: c.textMuted, marginTop: 6, fontSize: 13 }}>
                    {[item.courtName, item.nextHearingDate, item.nextHearingPurpose]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Pressable>

                {pending ? (
                  <>
                    <Text style={{ color: c.danger, fontSize: 12, fontWeight: '700' }}>
                      {t('missedDateNeedsEntry')}
                    </Text>
                    {!open ? (
                      <AppButton
                        title={t('enterNextDate')}
                        onPress={() => startEntry(item)}
                        fullWidth
                      />
                    ) : (
                      <View style={{ gap: 10, marginTop: 4 }}>
                        <DateField
                          label={t('nextHearing')}
                          required
                          value={entryDate}
                          onChange={setEntryDate}
                        />
                        <SelectField
                          label={t('hearingPurpose')}
                          required
                          value={entryPurpose}
                          options={HEARING_PURPOSE_OPTIONS}
                          placeholder={t('selectPurpose')}
                          onChange={setEntryPurpose}
                        />
                        <AppInput
                          label={t('importantNotes')}
                          value={entryNotes}
                          onChangeText={setEntryNotes}
                          multiline
                        />
                        {formError ? (
                          <Text style={{ color: c.danger, fontWeight: '700' }}>{formError}</Text>
                        ) : null}
                        <AppButton
                          title={savingId === item.id ? t('loading') : t('save')}
                          onPress={() => void submitEntry(item.id)}
                          disabled={savingId === item.id}
                          fullWidth
                        />
                        <AppButton
                          title={t('cancel')}
                          variant="outline"
                          onPress={() => setExpandedId(null)}
                          fullWidth
                        />
                      </View>
                    )}
                  </>
                ) : null}
              </AppCard>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
})
