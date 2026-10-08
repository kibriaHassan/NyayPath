import { useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { Avatar } from '../components/ui/Avatar'
import { BdLocationFilters } from '../components/search/BdLocationFilters'
import { SelectField } from '../components/ui/SelectField'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api } from '../api/client'
import { EMPTY_LOCATION, type BdLocationFilterValues } from '../data/locations'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { PublicTabParamList } from '../navigation/types'

type Lawyer = {
  id: string
  fullName: string
  district?: string
  division?: string
  court?: string
  practiceType?: string
  yearsOfExperience?: number
  photo?: string
  verified?: boolean
  chamberName?: string
  barAssociation?: string
}

type PracticeFilter = '' | 'civil' | 'criminal' | 'both'

type Props = BottomTabScreenProps<PublicTabParamList, 'Lawyers'>

export function LawyersScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [loc, setLoc] = useState<BdLocationFilterValues>(EMPTY_LOCATION)
  const [practice, setPractice] = useState<PracticeFilter>('')
  const [experience, setExperience] = useState('')
  const [bar, setBar] = useState('')
  const [list, setList] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api<{ data: Lawyer[] }>('/lawyers', { auth: false })
      .then((res) => {
        if (alive) setList(res.data || [])
      })
      .catch(() => {
        if (alive) setList([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const bars = useMemo(
    () => [...new Set(list.map((l) => l.barAssociation).filter(Boolean))] as string[],
    [list],
  )

  const filtered = useMemo(() => {
    return list.filter((l) => {
      if (loc.division && l.division && l.division !== loc.division) return false
      if (loc.district && l.district !== loc.district) return false
      if (loc.court && l.court !== loc.court) return false
      if (practice && (l.practiceType || 'both') !== practice) return false
      if (name.trim() && !l.fullName.toLowerCase().includes(name.trim().toLowerCase())) return false
      if (bar && l.barAssociation !== bar) return false
      if (experience && (l.yearsOfExperience || 0) < Number(experience)) return false
      return true
    })
  }, [list, loc, practice, name, bar, experience])

  const practiceOptions: { key: PracticeFilter; label: string }[] = [
    { key: '', label: t('allLawyers') },
    { key: 'civil', label: t('practiceCivil') },
    { key: 'criminal', label: t('practiceCriminal') },
    { key: 'both', label: t('practiceBoth') },
  ]

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <ScreenHeader title={t('findLawyer')} subtitle={t('lawyerSearchHint')} />
        <AppCard style={{ gap: 12 }}>
          <BdLocationFilters value={loc} onChange={setLoc} />
          <Text style={[styles.chipLabel, { color: c.textMuted }]}>{t('practiceType')}</Text>
          <View style={styles.chips}>
            {practiceOptions.map((opt) => {
              const active = practice === opt.key
              return (
                <Pressable
                  key={opt.key || 'all'}
                  onPress={() => setPractice(opt.key)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? c.primary : c.border,
                      backgroundColor: active ? c.primarySoft : c.inputBg,
                    },
                  ]}
                >
                  <Text style={{ color: active ? c.primary : c.text, fontWeight: '700', fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <AppInput
            label={t('lawyerName')}
            value={name}
            onChangeText={setName}
            placeholder={t('search')}
            blurOnSubmit={false}
          />
          <SelectField
            label={t('experience')}
            placeholder={t('anyExperience')}
            value={experience}
            options={[
              { value: '5', label: '৫+ বছর' },
              { value: '10', label: '১০+ বছর' },
              { value: '15', label: '১৫+ বছর' },
            ]}
            onChange={setExperience}
          />
          <SelectField
            label={t('barAssociation')}
            placeholder={t('allBars')}
            value={bar}
            options={bars.map((b) => ({ value: b, label: b }))}
            onChange={setBar}
          />
        </AppCard>

        <Text style={{ color: c.textMuted, fontWeight: '700' }}>
          {loading ? t('loading') : `${filtered.length} ${t('lawyersFound')}`}
        </Text>

        {!loading && filtered.length === 0 ? (
          <Text style={{ color: c.textMuted, textAlign: 'center' }}>{t('emptyLawyers')}</Text>
        ) : null}

        {filtered.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              navigation.getParent()?.navigate('LawyerProfile', {
                id: item.id,
                preview: item,
              })
            }
          >
            <AppCard style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Avatar uri={item.photo} name={item.fullName} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '800' }}>{item.fullName}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                  {[item.district, item.court].filter(Boolean).join(' · ') || '—'}
                </Text>
                <Text style={{ color: c.primary, fontSize: 12, marginTop: 4, fontWeight: '700' }}>
                  {item.yearsOfExperience || 0} {t('years')}
                  {item.verified ? ` · ${t('verified')}` : ''}
                </Text>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
