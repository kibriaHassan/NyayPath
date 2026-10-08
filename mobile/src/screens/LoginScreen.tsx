import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppInput } from '../components/ui/AppInput'
import { Screen } from '../components/ui/Screen'
import { ThemeLangToggles } from '../components/ui/ThemeLangToggles'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>
type Tab = 'lawyer' | 'staff'

export function LoginScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  const login = useAuthStore((s) => s.login)
  const [tab, setTab] = useState<Tab>('lawyer')
  const [email, setEmail] = useState('rafiqul@nyaypath.bd')
  const [password, setPassword] = useState('lawyer123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const gradient =
    theme === 'dark' ? (['#060e14', '#0f2a32'] as const) : (['#0a1f28', '#146a74'] as const)

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
    if (next === 'staff') {
      setEmail('mahmud@nyaypath.bd')
      setPassword('staff123')
    } else {
      setEmail('rafiqul@nyaypath.bd')
      setPassword('lawyer123')
    }
  }

  const onSubmit = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = await login(email.trim(), password)
      if (!result.ok) {
        setError(result.error || t('error'))
        return
      }
      // Auth state change remounts RootNavigator — do not replace() here
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <LinearGradient colors={[...gradient]} style={styles.hero}>
        <View style={styles.heroTop}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{t('back')}</Text>
          </Pressable>
          <ThemeLangToggles />
        </View>
        <Text style={styles.heroTitle}>{t('welcomeBack')}</Text>
        <Text style={styles.heroSub}>{t('loginSubtitle')}</Text>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: c.bgElevated }]}>
        <View style={[styles.tabs, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
          {(['lawyer', 'staff'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => switchTab(key)}
              style={[
                styles.tab,
                tab === key && { backgroundColor: c.card, shadowColor: '#000', elevation: 2 },
              ]}
            >
              <Text style={{ color: tab === key ? c.text : c.textMuted, fontWeight: '800' }}>
                {key === 'lawyer' ? t('lawyer') : t('staff')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 14, marginTop: 20 }}>
          <AppInput
            label={t('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label={t('password')}
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={{ color: c.danger, fontWeight: '600' }}>{error}</Text> : null}
          <AppButton
            title={loading ? t('loading') : t('login')}
            onPress={onSubmit}
            disabled={loading}
            fullWidth
          />
        </View>

        <View style={[styles.demo, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
          <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>{t('demoHint')}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
            {tab === 'lawyer' ? 'rafiqul@nyaypath.bd / lawyer123' : 'mahmud@nyaypath.bd / staff123'}
          </Text>
        </View>

        <AppButton
          title={t('createAccount')}
          variant="outline"
          onPress={() => navigation.navigate('Register')}
          fullWidth
          style={{ marginTop: 14 }}
        />
        <View style={styles.publicLinks}>
          <AppButton
            title={t('searchCase')}
            variant="ghost"
            onPress={() => navigation.navigate('PublicTabs', { screen: 'CaseSearch' })}
          />
          <AppButton
            title={t('findLawyer')}
            variant="ghost"
            onPress={() => navigation.navigate('PublicTabs', { screen: 'Lawyers' })}
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 15 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 18, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 14, lineHeight: 20 },
  sheet: {
    marginTop: -16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 40,
    minHeight: 420,
  },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  demo: { marginTop: 20, borderWidth: 1, borderRadius: 16, padding: 14 },
  publicLinks: { marginTop: 8, gap: 2 },
})
