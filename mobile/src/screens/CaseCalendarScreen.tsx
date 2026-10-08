import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { DonutChart } from '../components/ui/DonutChart'
import { AppMenuButton } from '../components/nav/AppDrawer'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import {
  casesForCalendarDay,
  sortByNextHearing,
  formatCourtDateHeading,
  isCourtHoliday,
  missingEntryDays,
  toDateKey,
  todayKey,
  type CaseHearingRow,
} from '../utils/courtCalendar'
import type { LawyerTabParamList, StaffTabParamList } from '../navigation/types'

type Props =
  | BottomTabScreenProps<LawyerTabParamList, 'CaseCalendar'>
  | BottomTabScreenProps<StaffTabParamList, 'CaseCalendar'>

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BN_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

const ENTERED = '#22A45D'
const MISSING = '#EF4444'
const HOLIDAY = '#D1D5DB'
const HEADER = '#1D4ED8'

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const pad = first.getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < pad; i += 1) {
    cells.push({ date: new Date(year, month, 1 - (pad - i)), inMonth: false })
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev)
    next.setDate(prev.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
}

export function CaseCalendarScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const lang = useSettingsStore((s) => s.lang)
  const dark = useSettingsStore((s) => s.theme) === 'dark'
  const [cases, setCases] = useState<CaseHearingRow[]>([])
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => todayKey())

  const load = useCallback(() => {
    api<{ data: CaseHearingRow[] }>('/cases')
      .then((res) => setCases(res.data || []))
      .catch(() => setCases([]))
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const today = todayKey()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthCells(year, month), [year, month])
  const redDays = useMemo(() => missingEntryDays(cases, today), [cases, today])
  const bucket = useMemo(() => {
    const day = casesForCalendarDay(cases, selected, today)
    return { ...day, all: sortByNextHearing(day.all), entered: sortByNextHearing(day.entered), missing: sortByNextHearing(day.missing) }
  }, [cases, selected, today])
  const total = bucket.all.length
  const enteredPct = total ? Math.round((bucket.entered.length / total) * 100) : 0
  const missingPct = total ? Math.round((bucket.missing.length / total) * 100) : 0
  const heading = formatCourtDateHeading(selected)
  const monthTitle = lang === 'bn' ? `${BN_MONTHS[month]} ${year}` : `${EN_MONTHS[month]} ${year}`
  const weekdays = lang === 'bn' ? BN_DAYS : EN_DAYS
  const card = dark ? c.card : '#ffffff'

  const shiftMonth = (delta: number) => {
    setCursor(new Date(year, month + delta, 1))
  }

  return (
    <Screen>
      <ScreenHeader title={t('caseCalendar')} leading={<AppMenuButton />} />

      <View style={[styles.calCard, { backgroundColor: card, borderColor: c.border }]}>
        <View style={styles.calHead}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={styles.chev}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.calTitle}>{monthTitle}</Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.chev}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {weekdays.map((label) => (
            <Text key={label} style={[styles.weekLabel, { color: c.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((cell) => {
            const key = toDateKey(cell.date)
            const holiday = cell.inMonth && isCourtHoliday(cell.date)
            const red = cell.inMonth && redDays.has(key)
            const isSelected = key === selected
            const isToday = key === today
            const fg = !cell.inMonth ? '#C5CDD6' : red || holiday ? '#fff' : c.text
            const bg = red ? MISSING : holiday ? HOLIDAY : 'transparent'
            return (
              <Pressable key={key} style={styles.cell} onPress={() => setSelected(key)}>
                <View
                  style={[
                    styles.dayBubble,
                    { backgroundColor: bg },
                    isSelected && !red && !holiday ? styles.selectedPlain : null,
                    isSelected && (red || holiday) ? styles.selectedFill : null,
                  ]}
                >
                  <Text style={[styles.dayText, { color: isSelected && !red && !holiday ? HEADER : fg }]}>
                    {cell.date.getDate()}
                  </Text>
                </View>
                {isToday ? <View style={styles.todayMark} /> : <View style={styles.todaySpacer} />}
              </Pressable>
            )
          })}
        </View>
        <View style={styles.legendBar}>
          <View style={[styles.legendDot, { backgroundColor: MISSING }]} />
          <Text style={styles.legendBarText}>{t('dateMissing')}</Text>
        </View>
      </View>

      <Text style={[styles.chartTitle, { color: ENTERED }]}>{heading.dateLine}</Text>
      <Text style={[styles.chartSub, { color: c.textMuted }]}>{t('dayCaseChart')}</Text>

      <View style={[styles.chartCard, { backgroundColor: card, borderColor: c.border }]}>
        <DonutChart
          slices={[
            { label: t('dateEntered'), value: bucket.entered.length, color: ENTERED },
            { label: t('dateMissing'), value: bucket.missing.length, color: MISSING },
          ]}
          size={150}
          stroke={18}
          centerLabel={String(total)}
          centerSub={t('cases')}
          labelColor={c.text}
          subColor={c.textMuted}
          track={dark ? '#243645' : '#E6EDF5'}
        />
        <View style={styles.legendCol}>
          <LegendRow color={ENTERED} label={t('dateEntered')} count={bucket.entered.length} pct={enteredPct} text={c.text} />
          <LegendRow color={MISSING} label={t('dateMissing')} count={bucket.missing.length} pct={missingPct} text={c.text} />
        </View>
      </View>

      {bucket.all.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>{t('noCasesThisDay')}</Text>
      ) : (
        bucket.all.map((item) => {
          const missed = bucket.missing.some((row) => row.id === item.id)
          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.getParent()?.navigate('CaseDetails', { id: item.id })}
              style={[styles.caseRow, { backgroundColor: card, borderColor: c.border }]}
            >
              <View style={[styles.caseMark, { backgroundColor: missed ? MISSING : ENTERED }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '800' }} numberOfLines={1}>
                  {item.caseNumber}
                </Text>
                <Text style={{ color: c.textMuted, marginTop: 2 }} numberOfLines={1}>
                  {item.caseTitle || item.title || item.courtName || '—'}
                </Text>
              </View>
              <Text style={{ color: missed ? MISSING : ENTERED, fontWeight: '800', fontSize: 12 }}>
                {missed ? t('dateMissing') : t('dateEntered')}
              </Text>
            </Pressable>
          )
        })
      )}
    </Screen>
  )
}

function LegendRow({
  color,
  label,
  count,
  pct,
  text,
}: {
  color: string
  label: string
  count: number
  pct: number
  text: string
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={{ color: text, flex: 1, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: text, fontWeight: '800' }}>
        {count} · {pct}%
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  calCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
  },
  calHead: {
    backgroundColor: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  chev: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  weekRow: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingBottom: 8 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPlain: { borderWidth: 2, borderColor: HEADER },
  selectedFill: { borderWidth: 2, borderColor: '#0f172a' },
  dayText: { fontSize: 14, fontWeight: '700' },
  todayMark: {
    width: 0,
    height: 0,
    marginTop: 2,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F5B942',
  },
  todaySpacer: { height: 8 },
  legendBar: {
    backgroundColor: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendBarText: { color: '#fff', fontWeight: '800' },
  chartTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  chartSub: { textAlign: 'center', marginTop: 2, marginBottom: 10, fontWeight: '700' },
  chartCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  legendCol: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  empty: { textAlign: 'center', marginTop: 8, fontWeight: '700' },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  caseMark: { width: 8, height: 36, borderRadius: 4 },
})
