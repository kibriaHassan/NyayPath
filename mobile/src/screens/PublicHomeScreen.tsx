import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { ThemeLangToggles } from '../components/ui/ThemeLangToggles'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { PublicTabParamList } from '../navigation/types'

type Props = BottomTabScreenProps<PublicTabParamList, 'Home'>

export function PublicHomeScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)

  return (
    <Screen>
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} right={<ThemeLangToggles />} />

      <LinearGradient
        colors={
          theme === 'dark'
            ? (['#0f2a32', '#146a74'] as const)
            : (['#0a1f28', '#146a74'] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>{t('premiumHint')}</Text>
        <Text style={styles.heroTitle}>{t('welcome')}</Text>
        <Text style={styles.heroSub}>{t('tagline')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <AppButton
            title={t('login')}
            variant="secondary"
            onPress={() => navigation.getParent()?.navigate('Login')}
          />
          <AppButton
            title={t('register')}
            variant="secondary"
            onPress={() => navigation.getParent()?.navigate('Register')}
          />
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        <Quick
          icon="search"
          title={t('searchCase')}
          color={c.primary}
          soft={c.primarySoft}
          text={c.text}
          muted={c.textMuted}
          border={c.border}
          card={c.card}
          onPress={() => navigation.navigate('CaseSearch')}
        />
        <Quick
          icon="people"
          title={t('findLawyer')}
          color={c.accent}
          soft="rgba(184,115,51,0.14)"
          text={c.text}
          muted={c.textMuted}
          border={c.border}
          card={c.card}
          onPress={() => navigation.navigate('Lawyers')}
        />
      </View>

      <AppCard style={{ marginTop: 14 }}>
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{t('settings')}</Text>
        <Text style={{ color: c.textMuted, marginTop: 4, marginBottom: 12 }}>{t('offlineHint')}</Text>
        <AppButton
          title={t('settings')}
          variant="outline"
          onPress={() => navigation.navigate('Settings')}
        />
      </AppCard>
    </Screen>
  )
}

function Quick(props: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  color: string
  soft: string
  text: string
  muted: string
  border: string
  card: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.quick,
        {
          backgroundColor: props.card,
          borderColor: props.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: props.soft }]}>
        <Ionicons name={props.icon} size={22} color={props.color} />
      </View>
      <Text style={{ color: props.text, fontWeight: '800', marginTop: 12 }}>{props.title}</Text>
      <Text style={{ color: props.muted, fontSize: 12, marginTop: 4 }}>→</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: 'rgba(201,162,39,0.95)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: { color: '#f7f1e8', fontSize: 26, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(247,241,232,0.78)', marginTop: 6, lineHeight: 20 },
  grid: { flexDirection: 'row', gap: 12 },
  quick: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 130,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
