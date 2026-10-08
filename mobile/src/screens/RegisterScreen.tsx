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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>
type Tab = 'lawyer' | 'staff'

export function RegisterScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  const registerLawyer = useAuthStore((s) => s.registerLawyer)
  const registerStaff = useAuthStore((s) => s.registerStaff)

  const [tab, setTab] = useState<Tab>('lawyer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [barAssociation, setBar] = useState('')
  const [enrollment, setEnrollment] = useState('')
  const [court, setCourt] = useState('')
  const [chamber, setChamber] = useState('')
  const [role, setRole] = useState('Legal Assistant')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const gradient =
    theme === 'dark' ? (['#060e14', '#0f2a32'] as const) : (['#0a1f28', '#146a74'] as const)

  const onSubmit = async () => {
    setError('')
    if (!name.trim() || !email.trim() || !password) {
      setError(t('fillRequired'))
      return
    }
    if (password.length < 6) {
      setError(t('passwordMin'))
      return
    }
    if (password !== confirm) {
      setError(t('passwordMismatch'))
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const result =
        tab === 'lawyer'
          ? await registerLawyer({
              fullName: name.trim(),
              email: email.trim(),
              mobile: mobile.trim(),
              password,
              barAssociation: barAssociation.trim(),
              enrollmentNumber: enrollment.trim(),
              court: court.trim(),
              district: court.trim(),
              chamberName: chamber.trim(),
              practiceType: 'civil',
              practiceArea: 'সিভিল',
            })
          : await registerStaff({
              name: name.trim(),
              email: email.trim(),
              mobile: mobile.trim(),
              password,
              role,
            })
      if (!result.ok) {
        setError(result.error || t('error'))
      }
      // Auth remount handles navigation
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
        <Text style={styles.heroTitle}>{t('register')}</Text>
        <Text style={styles.heroSub}>{t('registerSubtitle')}</Text>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: c.bgElevated }]}>
        <View style={[styles.tabs, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
          {(['lawyer', 'staff'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                setTab(key)
                setError('')
              }}
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

        <View style={{ gap: 12, marginTop: 18 }}>
          <AppInput label={t('fullName')} value={name} onChangeText={setName} />
          <AppInput
            label={t('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label={t('mobile')}
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
          />
          {tab === 'lawyer' ? (
            <>
              <AppInput label={t('barAssociation')} value={barAssociation} onChangeText={setBar} />
              <AppInput label={t('enrollment')} value={enrollment} onChangeText={setEnrollment} />
              <AppInput label={t('court')} value={court} onChangeText={setCourt} />
              <AppInput label={t('chamber')} value={chamber} onChangeText={setChamber} />
            </>
          ) : (
            <AppInput label={t('staffRole')} value={role} onChangeText={setRole} />
          )}
          <AppInput
            label={t('password')}
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          <AppInput
            label={t('confirmPassword')}
            isPassword
            value={confirm}
            onChangeText={setConfirm}
          />
          {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
          <AppButton
            title={loading ? t('loading') : t('createAccount')}
            onPress={onSubmit}
            disabled={loading}
            fullWidth
          />
          <AppButton
            title={t('haveAccount')}
            variant="ghost"
            onPress={() => navigation.navigate('Login')}
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
    minHeight: 480,
  },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
})
