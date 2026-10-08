import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { API_BASE } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  const lang = useSettingsStore((s) => s.lang)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const setLang = useSettingsStore((s) => s.setLang)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <Screen>
      <ScreenHeader title={t('settings')} />

      <Text style={[styles.section, { color: c.textMuted }]}>{t('appearance')}</Text>
      <AppCard style={{ marginBottom: 14 }}>
        <Row
          icon={theme === 'dark' ? 'moon' : 'sunny'}
          label={theme === 'dark' ? t('darkMode') : t('lightMode')}
          color={c}
          right={
            <Switch
              value={theme === 'dark'}
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
              trackColor={{ false: c.border, true: c.primary }}
            />
          }
        />
      </AppCard>

      <Text style={[styles.section, { color: c.textMuted }]}>{t('language')}</Text>
      <AppCard style={{ marginBottom: 14, gap: 8 }}>
        <LangOption active={lang === 'bn'} label={t('bangla')} onPress={() => setLang('bn')} c={c} />
        <LangOption active={lang === 'en'} label={t('english')} onPress={() => setLang('en')} c={c} />
      </AppCard>

      <Text style={[styles.section, { color: c.textMuted }]}>{t('account')}</Text>
      <AppCard style={{ marginBottom: 14 }}>
        {user ? (
          <>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{user.name}</Text>
            <Text style={{ color: c.textMuted, marginTop: 4 }}>{user.email}</Text>
            <Text style={{ color: c.primary, marginTop: 6, fontWeight: '700' }}>{user.role}</Text>
            <AppButton
              title={t('logout')}
              variant="danger"
              style={{ marginTop: 14 }}
              onPress={() => {
                Alert.alert(t('logout'), t('confirmLogout'), [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: t('logout'),
                    style: 'destructive',
                    onPress: () => {
                      void logout()
                    },
                  },
                ])
              }}
            />
          </>
        ) : (
          <AppButton
            title={t('login')}
            onPress={() => {
              const root = (navigation.getParent() ?? navigation) as {
                navigate: (name: string) => void
              }
              root.navigate('Login')
            }}
            fullWidth
          />
        )}
      </AppCard>

      <AppCard>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('connectedApi')}</Text>
        <Text style={{ color: c.text, marginTop: 4, fontSize: 12 }} selectable>
          {API_BASE}
        </Text>
        <Text style={{ color: c.textMuted, marginTop: 8, fontSize: 12 }}>{t('offlineHint')}</Text>
      </AppCard>
    </Screen>
  )
}

function Row({
  icon,
  label,
  right,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  right: React.ReactNode
  color: ReturnType<ReturnType<typeof useSettingsStore.getState>['colors']>
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={color.primary} />
        <Text style={{ color: color.text, fontWeight: '700' }}>{label}</Text>
      </View>
      {right}
    </View>
  )
}

function LangOption({
  active,
  label,
  onPress,
  c,
}: {
  active: boolean
  label: string
  onPress: () => void
  c: ReturnType<ReturnType<typeof useSettingsStore.getState>['colors']>
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.lang,
        {
          borderColor: active ? c.primary : c.border,
          backgroundColor: active ? c.primarySoft : 'transparent',
        },
      ]}
    >
      <Text style={{ color: active ? c.primary : c.text, fontWeight: '700' }}>{label}</Text>
      {active ? <Ionicons name="checkmark-circle" size={18} color={c.primary} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
