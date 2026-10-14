import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppCard } from '../components/ui/AppCard'
import { EmptyState } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import { dateKeyFromValue } from '../utils/courtCalendar'
import type { RootStackParamList } from '../navigation/types'

type HearingRow = {
  id: string
  caseId?: string
  hearingDate?: string
  hearingTime?: string
  hearingType?: string
  notes?: string
  court?: string
}

type TimelineItem = {
  key: string
  date: string
  title: string
  detail?: string
  tone: 'start' | 'past' | 'next'
}

type Props = NativeStackScreenProps<RootStackParamList, 'CaseHearingHistory'>

export function CaseHearingHistoryScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const { caseId, caseNumber, filingDate, nextHearingDate, nextHearingPurpose, courtName } =
    route.params
  const [hearings, setHearings] = useState<HearingRow[]>([])
  const [filing, setFiling] = useState(filingDate || '')
  const [nextDate, setNextDate] = useState(nextHearingDate || '')
  const [nextPurpose, setNextPurpose] = useState(nextHearingPurpose || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const publicRes = await api<{
          data: {
            filingDate?: string
            nextHearingDate?: string
            nextHearingPurpose?: string
            hearings?: HearingRow[]
          }
        }>(`/cases/search/detail/${caseId}`, { auth: false })
        if (cancelled) return
        setFiling(publicRes.data.filingDate || filingDate || '')
        setNextDate(publicRes.data.nextHearingDate || nextHearingDate || '')
        setNextPurpose(publicRes.data.nextHearingPurpose || nextHearingPurpose || '')
        const list = (publicRes.data.hearings || []).map((h, i) => ({
          ...h,
          id: h.id || `ph-${i}`,
        }))
        setHearings(list)
      } catch {
        try {
          const res = await api<{ data: HearingRow[] }>('/hearings')
          if (cancelled) return
          setHearings((res.data || []).filter((h) => h.caseId === caseId))
        } catch {
          if (!cancelled) setHearings([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [caseId, filingDate, nextHearingDate, nextHearingPurpose])

  const timeline = useMemo(() => {
    const rows: TimelineItem[] = []
    const filingKey = dateKeyFromValue(filing)
    const seen = new Set<string>()
    if (filingKey) {
      rows.push({
        key: `filing-${filingKey}`,
        date: filingKey,
        title: t('filingDate'),
        detail: t('caseFiled'),
        tone: 'start',
      })
      seen.add(filingKey)
    }

    const sorted = [...hearings].sort((a, b) =>
      dateKeyFromValue(b.hearingDate).localeCompare(dateKeyFromValue(a.hearingDate)),
    )
    for (const h of sorted) {
      const day = dateKeyFromValue(h.hearingDate)
      if (!day || seen.has(day)) continue
      seen.add(day)
      rows.push({
        key: h.id,
        date: day,
        title: h.hearingType || t('hearings'),
        detail: [h.hearingTime, h.notes, h.court || courtName].filter(Boolean).join(' · '),
        tone: 'past',
      })
    }

    const next = dateKeyFromValue(nextDate)
    if (next && !seen.has(next)) {
      rows.push({
        key: `next-${next}`,
        date: next,
        title: nextPurpose || t('nextHearing'),
        detail: t('upcomingDate'),
        tone: 'next',
      })
    }

    // Newest first (top), oldest last (bottom)
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [hearings, filing, nextDate, nextPurpose, courtName, t])

  return (
    <Screen>
      <ScreenHeader
        title={t('hearingHistory')}
        subtitle={caseNumber || undefined}
        onBack={() => navigation.goBack()}
      />
      <AppCard style={{ marginBottom: 12, backgroundColor: c.primarySoft, borderColor: c.primary }}>
        <Text style={{ color: c.primary, fontWeight: '800' }}>{t('hearingHistoryHint')}</Text>
        <Text style={{ color: c.textMuted, marginTop: 6, fontSize: 12 }}>
          নতুন তারিখ উপরে · পুরোনো তারিখ নিচে
        </Text>
      </AppCard>

      {loading ? <Text style={{ color: c.textMuted }}>{t('loading')}</Text> : null}
      {!loading && timeline.length === 0 ? <EmptyState text={t('emptyHearings')} /> : null}

      <View style={{ gap: 10, paddingBottom: 24 }}>
        {timeline.map((item, index) => {
          const color =
            item.tone === 'start' ? c.primary : item.tone === 'next' ? '#D97706' : c.success
          return (
            <View key={item.key} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 18 }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: color,
                    marginTop: 6,
                  }}
                />
                {index < timeline.length - 1 ? (
                  <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginTop: 4 }} />
                ) : null}
              </View>
              <AppCard style={{ flex: 1, marginBottom: 0 }}>
                <Text style={{ color: color, fontWeight: '800', fontSize: 13 }}>{item.date}</Text>
                <Text style={{ color: c.text, fontWeight: '800', marginTop: 4, fontSize: 16 }}>
                  {item.title}
                </Text>
                {item.detail ? (
                  <Text style={{ color: c.textMuted, marginTop: 4, lineHeight: 18 }}>
                    {item.detail}
                  </Text>
                ) : null}
              </AppCard>
            </View>
          )
        })}
      </View>
    </Screen>
  )
}
