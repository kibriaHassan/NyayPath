import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Avatar } from '../components/ui/Avatar'
import { DonutChart, type DonutSlice } from '../components/ui/DonutChart'
import { AppMenuButton } from '../components/nav/AppDrawer'
import { api } from '../api/client'
import { useStaffPerms } from '../hooks/useStaffPerms'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import {
  partitionDayCases,
  type CaseHearingRow,
  type DayCaseFilter,
} from '../utils/courtCalendar'
import type { LawyerTabParamList, StaffTabParamList } from '../navigation/types'

type Props =
  | BottomTabScreenProps<LawyerTabParamList, 'Dashboard'>
  | BottomTabScreenProps<StaffTabParamList, 'Dashboard'>

type Tile = {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  onPress: () => void
}

const TILE = {
  orange: '#F59A3A',
  teal: '#14B8A6',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#22C55E',
  pink: '#EC4899',
  yellow: '#F5B942',
  red: '#EF4444',
  indigo: '#6366F1',
  cyan: '#06B6D4',
  rose: '#F43F5E',
}

export function DashboardScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  const user = useAuthStore((s) => s.user)
  const insets = useSafeAreaInsets()
  const [cases, setCases] = useState<CaseHearingRow[]>([])
  const [staffCount, setStaffCount] = useState(0)
  const [nowTick, setNowTick] = useState(() => new Date())
  const isLawyer = user?.role === 'LAWYER'
  const { allow } = useStaffPerms()
  const dark = theme === 'dark'
  const nav = navigation as {
    navigate: (n: string, p?: object) => void
    getParent: () => { navigate: (n: string, p?: object) => void } | undefined
  }

  const parts = useMemo(() => partitionDayCases(cases, nowTick), [cases, nowTick])

  const statusSlices = useMemo<DonutSlice[]>(() => {
    const count = (status: string) => cases.filter((item) => item.status === status).length
    return [
      { label: 'Active', value: count('Active'), color: '#3B82F6' },
      { label: 'Hearing', value: count('Hearing Scheduled'), color: '#14B8A6' },
      { label: 'Pending', value: count('Pending'), color: '#F59A3A' },
      { label: 'Closed', value: count('Closed') + count('Disposed'), color: '#94A3B8' },
    ]
  }, [cases])

  const activeCount = statusSlices[0].value + statusSlices[1].value
  const activePct = cases.length ? Math.round((activeCount / cases.length) * 100) : 0

  const unassignedCount = useMemo(
    () => cases.filter((item) => !(item.assignedStaffIds || []).length).length,
    [cases],
  )

  const load = useCallback(() => {
    setNowTick(new Date())
    api<{ data: CaseHearingRow[] }>('/cases')
      .then((res) => setCases(res.data || []))
      .catch(() => setCases([]))
    if (user?.role === 'LAWYER') {
      api<{ data: { active?: boolean }[] }>('/staff')
        .then((res) => setStaffCount((res.data || []).filter((row) => row.active !== false).length))
        .catch(() => setStaffCount(0))
    }
  }, [user?.role])

  useFocusEffect(
    useCallback(() => {
      load()
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
    }, [load, user?.id]),
  )

  const goDay = (filter: DayCaseFilter) => nav.navigate('DayCases', { filter })
  const root = () => nav.getParent()

  const primaryTiles: Tile[] = [
    { key: 'today', label: t('todayCases'), icon: 'today', color: TILE.orange, onPress: () => goDay('today') },
    { key: 'next', label: t('nextDayCases'), icon: 'calendar', color: TILE.teal, onPress: () => goDay('next') },
    { key: 'pending', label: t('pendingEntry'), icon: 'alert-circle', color: TILE.red, onPress: () => goDay('pending') },
    { key: 'cases', label: t('cases'), icon: 'briefcase', color: TILE.purple, onPress: () => nav.navigate('Cases') },
    ...(isLawyer || allow('addCase')
      ? [{ key: 'add', label: t('addCase'), icon: 'add-circle' as const, color: TILE.green, onPress: () => root()?.navigate('CaseForm', { mode: 'create' }) }]
      : []),
    { key: 'tasks', label: t('tasks'), icon: 'checkbox', color: TILE.blue, onPress: () => root()?.navigate('Tasks') },
    { key: 'docs', label: t('documents'), icon: 'document-text', color: TILE.pink, onPress: () => root()?.navigate('Documents') },
    { key: 'bell', label: t('notifications'), icon: 'notifications', color: TILE.yellow, onPress: () => root()?.navigate('Notifications') },
  ]

  const secondaryTiles: Tile[] = [
    ...(isLawyer
      ? [{ key: 'staff', label: t('staffTeam'), icon: 'people' as const, color: TILE.indigo, onPress: () => root()?.navigate('StaffList') }]
      : []),
    {
      key: 'profile',
      label: t('profile'),
      icon: 'person',
      color: TILE.cyan,
      onPress: () => root()?.navigate(isLawyer ? 'LawyerOwnProfile' : 'StaffProfile'),
    },
    { key: 'settings', label: t('settings'), icon: 'settings', color: TILE.rose, onPress: () => root()?.navigate('Settings') },
  ]

  const sideCards = [
    { key: 'today', label: t('todayCases'), value: parts.todayCases.length, bg: '#FFF6DE', ink: '#B45309', bar: '#F59A3A', onPress: () => goDay('today') },
    { key: 'next', label: t('nextDayCases'), value: parts.nextCases.length, bg: '#FDE8F3', ink: '#BE185D', bar: '#EC4899', onPress: () => goDay('next') },
    { key: 'pending', label: t('pendingEntry'), value: parts.pendingCases.length, bg: '#E7FBF6', ink: '#0F766E', bar: '#14B8A6', onPress: () => goDay('pending') },
  ]
  const sideMax = Math.max(1, ...sideCards.map((card) => card.value))

  const cardBg = dark ? c.card : '#ffffff'
  const pageHint = dark ? c.textMuted : '#64748b'

  const pageBg = dark ? c.bg : '#F3F6FB'

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: pageBg,
            borderBottomColor: c.border,
          },
        ]}
      >
        <AppMenuButton />
        <Avatar uri={user?.photo} name={user?.name} size={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.primary, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
            {t('appName')}
          </Text>
          <Text style={{ color: c.text, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        <Pressable
          onPress={() => root()?.navigate('Notifications')}
          hitSlop={6}
          style={[styles.iconBtn, { backgroundColor: cardBg, borderColor: c.border }]}
        >
          <Ionicons name="notifications-outline" size={20} color={c.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.grid}>
        {primaryTiles.map((tile) => (
          <TileButton key={tile.key} tile={tile} labelColor={c.text} />
        ))}
      </View>

      <Text style={[styles.section, { color: c.text }]}>{t('caseOverview')}</Text>
      <View style={styles.overviewRow}>
        <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor: c.border }]}>
          <DonutChart
            slices={statusSlices}
            centerLabel={`${activePct}%`}
            centerSub={t('active')}
            labelColor={c.text}
            subColor={pageHint}
            track={dark ? '#243645' : '#E6EDF5'}
          />
          <View style={styles.legend}>
            {statusSlices.map((slice) => (
              <View key={slice.label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: slice.color }]} />
                <Text style={{ color: pageHint, fontSize: 11, flex: 1 }} numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text style={{ color: c.text, fontSize: 12, fontWeight: '800' }}>{slice.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.sideCol}>
          {sideCards.map((card) => (
            <Pressable
              key={card.key}
              onPress={card.onPress}
              style={[styles.sideCard, { backgroundColor: dark ? c.bgElevated : card.bg, borderColor: c.border }]}
            >
              <Text style={{ color: dark ? c.textMuted : card.ink, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                {card.label}
              </Text>
              <Text style={{ color: dark ? c.text : card.ink, fontSize: 20, fontWeight: '800' }}>{card.value}</Text>
              <View style={[styles.barTrack, { backgroundColor: dark ? '#243645' : 'rgba(255,255,255,0.75)' }]}>
                {card.value > 0 ? (
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(12, Math.round((card.value / sideMax) * 100))}%`, backgroundColor: card.bar },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {isLawyer ? (
        <View style={styles.statRow}>
          <StatBubble
            icon="briefcase"
            colors={['#1D4ED8', '#60A5FA']}
            value={cases.length}
            label={t('totalCases')}
            onPress={() => nav.navigate('Cases')}
          />
          <StatBubble
            icon="people"
            colors={['#C2410C', '#FB923C']}
            value={staffCount}
            label={t('totalStaff')}
            onPress={() => root()?.navigate('StaffList')}
          />
          <StatBubble
            icon="person"
            colors={['#047857', '#34D399']}
            value={unassignedCount}
            label={t('selfManaged')}
            onPress={() => nav.navigate('Cases', { unassigned: true })}
          />
        </View>
      ) : null}

      <View style={[styles.grid, { marginTop: 16 }]}>
        {secondaryTiles.map((tile) => (
          <TileButton key={tile.key} tile={tile} labelColor={c.text} />
        ))}
      </View>
      </ScrollView>
    </View>
  )
}

function StatBubble({
  icon,
  colors,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  colors: readonly [string, string]
  value: number
  label: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.statItem}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statShape}>
        <View style={styles.statOrb} />
        <View style={styles.statNotch} />
        <View style={styles.statIcon}>
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={2}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  )
}

function TileButton({ tile, labelColor }: { tile: Tile; labelColor: string }) {
  return (
    <Pressable onPress={tile.onPress} style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tile.color }]}>
        <Ionicons name={tile.icon} size={26} color="#fff" />
      </View>
      <Text style={[styles.tileLabel, { color: labelColor }]} numberOfLines={2}>
        {tile.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  tileIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 10,
  },
  overviewRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  chartCard: {
    flex: 1.35,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  legend: { alignSelf: 'stretch', gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sideCol: { flex: 0.9, gap: 8 },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statItem: { flex: 1 },
  statShape: {
    minHeight: 118,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statOrb: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -22,
    right: -16,
  },
  statNotch: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    bottom: 10,
    left: -10,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { marginTop: 8, color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { marginTop: 2, color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700', lineHeight: 14 },
  sideCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 2,
  },
  barTrack: { height: 6, borderRadius: 6, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 6, borderRadius: 6 },
})
