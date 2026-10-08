import { useCallback, useState } from 'react'
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
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { BdLocationFilters } from '../components/search/BdLocationFilters'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api, ApiError } from '../api/client'
import {
  EMPTY_LOCATION,
  normalizeCaseNumber,
  toAsciiCaseNumberInput,
  type BdLocationFilterValues,
} from '../data/locations'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { PublicTabParamList } from '../navigation/types'

type CaseHit = {
  id: string
  caseNumber: string
  caseTitle?: string
  title?: string
  courtName?: string
  district?: string
  division?: string
  status?: string
}

type Props = BottomTabScreenProps<PublicTabParamList, 'CaseSearch'>

export function CaseSearchScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState<BdLocationFilterValues>(EMPTY_LOCATION)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<CaseHit[]>([])

  const search = useCallback(async () => {
    setError('')
    if (!loc.division || !loc.district) {
      setError(t('needDivisionDistrict'))
      return
    }
    if (!q.trim()) {
      setError(t('needCaseNumber'))
      return
    }
    const num = normalizeCaseNumber(q)
    if (!num.ok) {
      setError(num.error)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      // Required: division + district + case number
      // Optional: courtType / court — narrow to one court when set
      const params = new URLSearchParams({
        q: num.value,
        division: loc.division.trim(),
        district: loc.district.trim(),
      })
      const courtType = loc.courtType.trim()
      const court = loc.court.trim()
      if (courtType) params.set('courtType', courtType)
      if (court) params.set('court', court)
      const res = await api<{ data: CaseHit[] }>(`/cases/search?${params.toString()}`, {
        auth: false,
      })
      setResults(res.data || [])
    } catch (e) {
      setResults([])
      setError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [q, loc, t])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
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
        <ScreenHeader title={t('caseSearch')} subtitle={t('caseSearchHint')} />
        <AppCard style={{ gap: 12 }}>
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 20 }}>
            {t('caseSearchRules')}
          </Text>
          <BdLocationFilters value={loc} onChange={setLoc} />
          <AppInput
            label={t('caseNumber')}
            value={q}
            onChangeText={(text) => setQ(toAsciiCaseNumberInput(text))}
            placeholder={t('searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            blurOnSubmit={false}
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
          {error ? <Text style={{ color: c.danger, fontWeight: '600' }}>{error}</Text> : null}
          {(!loc.division || !loc.district) && (
            <Text style={{ color: c.textMuted, fontSize: 13 }}>{t('needDivisionDistrict')}</Text>
          )}
          <AppButton
            title={loading ? t('loading') : t('searchCase')}
            onPress={() => void search()}
            disabled={loading || !loc.division || !loc.district}
            fullWidth
          />
        </AppCard>

        {searched ? (
          <Text style={{ color: c.textMuted, fontWeight: '700' }}>
            {loading ? t('loading') : `${results.length} ${t('casesFound')}`}
          </Text>
        ) : null}

        {searched && !loading && results.length === 0 ? (
          <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 8 }}>
            {t('emptyCases')}
          </Text>
        ) : null}

        {results.map((item) => (
          <Pressable
            key={item.id}
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
                {[item.courtName, item.district, item.division].filter(Boolean).join(' · ')}
              </Text>
              {item.status ? (
                <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
                  <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>
                    {item.status}
                  </Text>
                </View>
              ) : null}
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
})
