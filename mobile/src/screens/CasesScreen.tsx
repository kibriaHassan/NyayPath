import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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

export function CasesScreen({ navigation, route }: Props) {
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
  const dark = useSettingsStore((s) => s.theme) === 'dark'
  const unassignedRef = useRef(false)
  unassignedRef.current = Boolean(route.params?.unassigned)

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
      setStaff(res.data || [])
    } catch {
      setStaff([])
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (unassignedRef.current) {
        setApplied({ name: '', number: '', date: '', staffId: '__self__' })
        setNameQ('')
        setNumberQ('')
        setDateQ('')
        setStaffId('')
        navigation.setParams({ unassigned: undefined })
      }
      void load()
      void loadStaff()
      return () => {
        setFiltersOpen(false)
        setNameQ('')
        setNumberQ('')
        setDateQ('')
        setStaffId('')
        setApplied({ name: '', number: '', date: '', staffId: '' })
      }
    }, [user?.id, token, isLawyer, navigation]),
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
      if (applied.staffId === '__self__') {
        if ((item.assignedStaffIds || []).length > 0) return false
      } else if (applied.staffId && !(item.assignedStaffIds || []).includes(applied.staffId)) return false
      return true
    })
  }, [list, applied])

  const ordered = useMemo(() => sortByNextHearing(filtered), [filtered])

  const filtersOn = Boolean(applied.name.trim() || applied.number.trim() || applied.date.trim() || applied.staffId)

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (applied.name.trim()) chips.push({ key: 'name', label: `${t('searchName')}: ${applied.name.trim()}` })
    if (applied.number.trim()) chips.push({ key: 'number', label: `${t('caseNumber')}: ${applied.number.trim()}` })
    if (applied.date.trim()) chips.push({ key: 'date', label: `${t('searchDate')}: ${applied.date.trim()}` })
    if (applied.staffId === '__self__') chips.push({ key: 'staff', label: t('selfManaged') })
    else if (applied.staffId) {
      const row = staff.find((item) => item.id === applied.staffId)
      chips.push({ key: 'staff', label: `${t('searchStaff')}: ${row?.name || applied.staffId}` })
    }
    return chips
  }, [applied, staff, t])

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
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <Pressable
            onPress={openFilters}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 14,
              backgroundColor: c.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{t('filters')}</Text>
          </Pressable>
          <Pressable
            onPress={showAll}
            disabled={!filtersOn}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: filtersOn ? c.primary : c.border,
              backgroundColor: filtersOn ? c.primarySoft : c.card,
              opacity: filtersOn ? 1 : 0.45,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="albums-outline" size={18} color={filtersOn ? c.primary : c.textMuted} />
            <Text style={{ color: filtersOn ? c.primary : c.textMuted, fontWeight: '800', fontSize: 14 }}>
              {t('showAllCases')}
            </Text>
          </Pressable>
        </View>
        {activeChips.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {activeChips.map((chip) => (
              <View
                key={chip.key}
                style={{
                  borderRadius: 999,
                  backgroundColor: c.primarySoft,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: '800' }}>{chip.label}</Text>
              </View>
            ))}
            <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700', alignSelf: 'center' }}>
              {ordered.length}/{list.length}
            </Text>
          </View>
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
        renderItem={({ item }) => {
          const names = (item.assignedStaffIds || [])
            .map((id) => staff.find((row) => row.id === id)?.name || (id === user?.id ? user?.name : ''))
            .filter(Boolean)
          const withStaff = names.length > 0
          return (
          <Pressable
            onPress={() =>
              navigation.getParent()?.navigate('CaseDetails', {
                id: item.id,
                preview: item,
              })
            }
          >
            <AppCard
              style={
                withStaff
                  ? {
                      backgroundColor: dark ? '#3A2A14' : '#FFF6EA',
                      borderColor: dark ? '#E8A54B' : '#F0B45A',
                      borderLeftWidth: 5,
                      borderLeftColor: '#E8942A',
                    }
                  : { borderLeftWidth: 5, borderLeftColor: c.primary }
              }
            >
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
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: '800',
                  color: withStaff ? (dark ? '#F6C27A' : '#B86A12') : c.textMuted,
                }}
              >
                {withStaff ? `${t('assignedStaff')}: ${names.join(', ')}` : t('selfManaged')}
              </Text>
              {item.status ? <StatusPill label={item.status} /> : null}
            </AppCard>
          </Pressable>
          )
        }}
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
                  options={staff.filter((row) => row.active !== false).map((row) => ({
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
