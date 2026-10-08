import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { ThemeLangToggles } from '../components/ui/ThemeLangToggles'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>

export function WelcomeScreen({ navigation }: Props) {
  const t = useT()
  const theme = useSettingsStore((s) => s.theme)
  const c = useSettingsStore((s) => s.colors())

  const gradient =
    theme === 'dark'
      ? (['#040a10', '#0c2430', '#13404a'] as const)
      : (['#071820', '#0d3a44', '#146a74'] as const)

  return (
    <LinearGradient colors={[...gradient]} style={styles.root}>
      <View style={styles.orbA} />
      <View style={styles.orbB} />

      <View style={styles.top}>
        <ThemeLangToggles />
      </View>

      <View style={styles.hero}>
        <View style={styles.logoRing}>
          <View style={styles.logo}>
            <Ionicons name="scale-outline" size={34} color="#f7f1e8" />
          </View>
        </View>
        <Text style={styles.brand}>{t('appName')}</Text>
        <View style={styles.goldLine} />
        <Text style={styles.tagline}>{t('tagline')}</Text>
        <Text style={styles.premiumHint}>{t('premiumHint')}</Text>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bgElevated }]}>
        <Text style={[styles.sheetTitle, { color: c.text }]}>{t('getStarted')}</Text>
        <Text style={{ color: c.textMuted, marginBottom: 18, lineHeight: 20 }}>
          {t('loginSubtitle')}
        </Text>
        <AppButton title={t('login')} onPress={() => navigation.navigate('Login')} fullWidth />
        <View style={{ height: 10 }} />
        <AppButton
          title={t('register')}
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          fullWidth
        />

        <View style={styles.features}>
          <Feature
            icon="search-outline"
            label={t('searchCase')}
            color={c.primary}
            muted={c.textMuted}
            onPress={() => navigation.navigate('PublicTabs', { screen: 'CaseSearch' })}
          />
          <Feature
            icon="people-outline"
            label={t('findLawyer')}
            color={c.accent}
            muted={c.textMuted}
            onPress={() => navigation.navigate('PublicTabs', { screen: 'Lawyers' })}
          />
        </View>
      </View>
    </LinearGradient>
  )
}

function Feature({
  icon,
  label,
  color,
  muted,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
  muted: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.feature, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ color: muted, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orbA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(201,162,39,0.12)',
    top: -40,
    right: -60,
  },
  orbB: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(62,196,209,0.1)',
    top: 160,
    left: -50,
  },
  top: {
    paddingTop: 56,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoRing: {
    width: 86,
    height: 86,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  brand: {
    color: '#f7f1e8',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  goldLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#c9a227',
    marginTop: 12,
    marginBottom: 10,
  },
  tagline: {
    color: 'rgba(247,241,232,0.82)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  premiumHint: {
    color: 'rgba(201,162,39,0.95)',
    marginTop: 14,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    gap: 12,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
