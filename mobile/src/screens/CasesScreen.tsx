import { useCallback, useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { DateField } from '../components/ui/DateField'
import { EmptyState, StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SelectField } from '../components/ui/SelectField'
import { AppMenuButton } from '../components/nav/AppDrawer'
import { api, API_BASE, ApiError } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import { sortByNextHearing } from '../utils/courtCalendar'
import type { LawyerTabParamList, StaffTabParamList } from '../navigation/types'

type CaseItem = {
  id: string
  caseNumber: string
  caseTitle?: string
  title?: string
  status?: string
  courtName?: string
  nextHearingDate?: string
  filingDate?: string
  lastHearingDate?: string
  district?: string
  plaintiff?: string
  defendant?: string
  assignedStaffIds?: string[]
}

type StaffRow = { id: string; name: string; staffCode?: string; active?: boolean }

function onDate(value: string | undefined, day: string) {
  return Boolean(value && (value.slice(0, 10) === day || value.startsWith(day)))
}

type Props =
  | BottomTabScreenProps<LawyerTabParamList, 'Cases'>
  | BottomTabScreenProps<StaffTabParamList, 'Cases'>

export function CasesScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const [list, setList] = useState<CaseItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [nameQ, setNameQ] = useState('')
  const [numberQ, setNumberQ] = useState('')
  const [dateQ, setDateQ] = useState('')
  const [staffId, setStaffId] = useState('')
  const [applied, setApplied] = useState({ name: '', number: '', date: '', staffId: '' })
  const [staff, setStaff] = useState<StaffRow[]>([])
  const isLawyer = user?.role === 'LAWYER'

  const goLogin = () => {
    void logout()
  }

  const load = async () => {
    setError('')
    setNeedsLogin(false)
    if (!token || token.startsWith('demo-')) {
      setList([])
      setNeedsLogin(true)
      setError(t('sessionExpired'))
      return
    }
    try {
      const res = await api<{ data: CaseItem[] }>('/cases')
      setList(res.data || [])
    } catch (e) {
      setList([])
      if (e instanceof ApiError && e.status === 401) {
        setNeedsLogin(true)
        setError(t('sessionExpired'))
      } else {
        setError(e instanceof ApiError ? e.message : t('error'))
      }
    }
  }

  const loadStaff = async () => {
    if (!isLawyer) return
    try {
      const res = await api<{ data: StaffRow[] }>('/staff')
      setStaff((res.data || []).filter((row) => row.active !== false))
    } catch {
      setStaff([])
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load()
      void loadStaff()
    }, [user?.id, token, isLawyer]),
  )

  const filtered = useMemo(() => {
    const name = applied.name.trim().toLowerCase()
    const number = applied.number.trim().toLowerCase()
    const day = applied.date.trim()
    return list.filter((item) => {
      if (name) {
        const blob = [item.caseTitle, item.title, item.plaintiff, item.defendant]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!blob.includes(name)) return false
      }
      if (number && !String(item.caseNumber || '').toLowerCase().includes(number)) return false
      if (
        day &&
        !onDate(item.nextHearingDate, day) &&
        !onDate(item.filingDate, day) &&
        !onDate(item.lastHearingDate, day)
      ) {
        return false
      }
      if (applied.staffId && !(item.assignedStaffIds || []).includes(applied.staffId)) return false
      return true
    })
  }, [list, applied])

  const ordered = useMemo(() => sortByNextHearing(filtered), [filtered])

  const filtersOn = Boolean(applied.name.trim() || applied.number.trim() || applied.date.trim() || applied.staffId)

  const openFilters = () => {
    setNameQ(applied.name)
    setNumberQ(applied.number)
    setDateQ(applied.date)
    setStaffId(applied.staffId)
    setFiltersOpen(true)
  }

  const applyFilters = () => {
    setApplied({ name: nameQ, number: numberQ, date: dateQ, staffId })
    setFiltersOpen(false)
  }

  const showAll = () => {
    setNameQ('')
    setNumberQ('')
    setDateQ('')
    setStaffId('')
    setApplied({ name: '', number: '', date: '', staffId: '' })
    setFiltersOpen(false)
  }

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader
          title={t('cases')}
          subtitle={isLawyer ? t('myCases') : t('assignedCases')}
          leading={<AppMenuButton />}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <AppButton title={t('filters')} onPress={openFilters} style={{ flex: 1 }} />
          <AppButton
            title={t('showAllCases')}
            variant="outline"
            onPress={showAll}
            disabled={!filtersOn}
            style={{ flex: 1 }}
          />
        </View>
        {filtersOn ? (
          <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 8 }}>
            {ordered.length} / {list.length}
          </Text>
        ) : null}
        {error ? (
          <AppCard style={{ marginBottom: 8, borderColor: c.danger }}>
            <Text style={{ color: c.danger, fontWeight: '700' }}>{error}</Text>
            <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>{API_BASE}</Text>
            {needsLogin ? (
              <AppButton
                title={t('loginAgain')}
                onPress={() => void goLogin()}
                style={{ marginTop: 10 }}
                fullWidth
              />
            ) : (
              <AppButton
                title={t('retry')}
                variant="outline"
                onPress={() => void load()}
                style={{ marginTop: 10 }}
              />
            )}
          </AppCard>
        ) : null}
      </View>
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
            tintColor={c.primary}
          />
        }
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <EmptyState text={needsLogin ? t('sessionExpired') : error ? t('retry') : t('emptyCases')} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.getParent()?.navigate('CaseDetails', {
                id: item.id,
                preview: item,
              })
            }
          >
            <AppCard>
              <Text style={{ color: c.primary, fontWeight: '800' }}>{item.caseNumber}</Text>
              <Text style={{ color: c.text, fontWeight: '700', marginTop: 4 }}>
                {item.caseTitle || item.title || '—'}
              </Text>
              <Text style={{ color: c.textMuted, marginTop: 6, fontSize: 13 }}>
                {item.courtName || '—'}
                {item.district ? ` · ${item.district}` : ''}
              </Text>
              {item.nextHearingDate ? (
                <Text style={{ color: c.accent, marginTop: 6, fontSize: 12, fontWeight: '700' }}>
                  {t('nextHearing')}: {item.nextHearingDate}
                </Text>
              ) : null}
              {item.status ? <StatusPill label={item.status} /> : null}
            </AppCard>
          </Pressable>
        )}
      />

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(7,24,32,0.45)' }} onPress={() => setFiltersOpen(false)} />
          <View
            style={{
              width: '86%',
              maxWidth: 380,
              backgroundColor: c.bg,
              padding: 18,
              paddingTop: 28,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{t('filters')}</Text>
              <AppInput
                label={t('searchName')}
                value={nameQ}
                onChangeText={setNameQ}
                placeholder={t('caseTitle')}
                autoCorrect={false}
              />
              <AppInput
                label={t('caseNumber')}
                value={numberQ}
                onChangeText={setNumberQ}
                placeholder="123/2026"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <DateField label={t('searchDate')} value={dateQ} onChange={setDateQ} placeholder="YYYY-MM-DD" />
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: -4 }}>{t('searchDateHint')}</Text>
              {isLawyer ? (
                <SelectField
                  label={t('searchStaff')}
                  value={staffId}
                  placeholder={staff.length ? t('allStaff') : t('emptyStaff')}
                  options={staff.map((row) => ({
                    value: row.id,
                    label: `${row.name}${row.staffCode ? ` (${row.staffCode})` : ''}`,
                  }))}
                  onChange={setStaffId}
                />
              ) : null}
              <AppButton title={t('applySearch')} onPress={applyFilters} fullWidth />
              <AppButton title={t('showAllCases')} variant="outline" onPress={showAll} fullWidth />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
