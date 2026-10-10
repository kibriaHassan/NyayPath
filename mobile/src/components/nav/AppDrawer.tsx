import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Avatar } from '../ui/Avatar'
import { useNavigation, useNavigationState, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStaffPerms } from '../../hooks/useStaffPerms'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore, useT } from '../../store/settingsStore'
import type { RootStackParamList } from '../../navigation/types'

const PANEL = Math.min(Dimensions.get('window').width * 0.78, 340)

const OpenDrawerContext = createContext<() => void>(() => {})

export function useOpenDrawer() {
  return useContext(OpenDrawerContext)
}

export function AppMenuButton() {
  const open = useOpenDrawer()
  const c = useSettingsStore((s) => s.colors())
  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityLabel="Menu"
      style={[styles.menuBtn, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <Ionicons name="menu" size={22} color={c.text} />
    </Pressable>
  )
}

export function AppDrawerHost({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <OpenDrawerContext.Provider value={() => setOpen(true)}>
      <View style={{ flex: 1 }}>
        {children}
        <SideDrawer open={open} onClose={() => setOpen(false)} />
      </View>
    </OpenDrawerContext.Provider>
  )
}

type StackNav = NativeStackNavigationProp<RootStackParamList>

function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const lang = useSettingsStore((s) => s.lang)
  const setLang = useSettingsStore((s) => s.setLang)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<StackNav>()
  const route = useRoute()
  const [rendered, setRendered] = useState(false)
  const progress = useRef(new Animated.Value(0)).current
  const closing = useRef(false)
  const isLawyer = user?.role === 'LAWYER'
  const { allow, isStaff } = useStaffPerms()
  const activeTab = useNavigationState((state) => {
    const current = state.routes[state.index]
    const nested = current?.state
    if (!nested || nested.index == null) return 'Dashboard'
    return String(nested.routes[nested.index]?.name || 'Dashboard')
  })

  const playOpen = () => {
    if (closing.current) return
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }

  const requestClose = () => {
    if (closing.current) return
    closing.current = true
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      closing.current = false
      setRendered(false)
      onClose()
    })
  }

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  const goStack = (
    name:
      | 'LawyerOwnProfile'
      | 'StaffProfile'
      | 'Tasks'
      | 'Documents'
      | 'Notifications'
      | 'StaffList'
      | 'Settings',
  ) => {
    requestClose()
    navigation.navigate(name)
  }

  const goTab = (screen: 'Dashboard' | 'Cases' | 'DayCases' | 'CaseCalendar') => {
    requestClose()
    const tab = route.name === 'StaffTabs' ? 'StaffTabs' : 'LawyerTabs'
    navigation.navigate(tab, { screen })
  }

  const doLogout = () => {
    Alert.alert(t('logout'), t('confirmLogout'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: () => {
          requestClose()
          void logout()
        },
      },
    ])
  }

  const showCases = !isStaff || allow('viewCases') || allow('editCases') || allow('addCase')
  const showHearings = !isStaff || allow('viewHearingDates') || allow('editHearingDates')
  const items: { key: string; label: string; onPress: () => void }[] = [
    { key: 'Dashboard', label: t('home'), onPress: () => goTab('Dashboard') },
    {
      key: 'Profile',
      label: t('profile'),
      onPress: () => goStack(isLawyer ? 'LawyerOwnProfile' : 'StaffProfile'),
    },
    ...(showCases ? [{ key: 'Cases', label: t('cases'), onPress: () => goTab('Cases') }] : []),
    ...(showHearings ? [{ key: 'DayCases', label: t('dayCases'), onPress: () => goTab('DayCases') }] : []),
    ...(showHearings || showCases
      ? [{ key: 'Calendar', label: t('caseCalendar'), onPress: () => goTab('CaseCalendar') }]
      : []),
    ...(!isStaff || allow('manageTasks')
      ? [{ key: 'Tasks', label: t('tasks'), onPress: () => goStack('Tasks') }]
      : []),
    ...(!isStaff || allow('manageDocuments')
      ? [{ key: 'Documents', label: t('documents'), onPress: () => goStack('Documents') }]
      : []),
    { key: 'Notifications', label: t('notifications'), onPress: () => goStack('Notifications') },
    ...(isLawyer ? [{ key: 'Staff', label: t('staffTeam'), onPress: () => goStack('StaffList') }] : []),
    { key: 'Settings', label: t('settings'), onPress: () => goStack('Settings') },
  ]

  if (!rendered) return null

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL - 16, 0],
  })

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={playOpen}
      onRequestClose={requestClose}
    >
      <View style={styles.sheet}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress, top: insets.top + 8 }]}
        />
      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL,
            top: insets.top + 8,
            backgroundColor: c.card,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateX }],
          },
        ]}
      >
          <LinearGradient colors={['#0d3a44', '#146a74', '#1a8f9c'] as const} style={styles.brand}>
            <Avatar
              uri={user?.photo}
              name={user?.name}
              size={74}
              radius={37}
              style={styles.avatar}
            />
            <Text style={styles.brandName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={styles.brandRole}>{isLawyer ? t('roleLawyer') : t('roleStaff')}</Text>
          </LinearGradient>
          <ScrollView style={{ flex: 1, backgroundColor: c.card }} bounces={false}>
            {items.map((item) => {
              const active = item.key === activeTab
              return (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  style={[
                    styles.item,
                    {
                      borderBottomColor: c.border,
                      backgroundColor: active ? c.primarySoft : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.itemMark, { backgroundColor: active ? c.primary : '#d7e4e8' }]} />
                  <Text style={[styles.itemText, { color: active ? c.primary : c.text }]}>{item.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
          <View style={[styles.prefs, { borderTopColor: c.border, backgroundColor: c.bg }]}>
            <Text style={[styles.prefLabel, { color: c.textMuted }]}>{t('language')}</Text>
            <View style={styles.prefRow}>
              <PrefChip label={t('bangla')} active={lang === 'bn'} onPress={() => setLang('bn')} />
              <PrefChip label={t('english')} active={lang === 'en'} onPress={() => setLang('en')} />
            </View>
            <Text style={[styles.prefLabel, { color: c.textMuted, marginTop: 12 }]}>{t('theme')}</Text>
            <View style={styles.prefRow}>
              <PrefChip
                label={t('lightMode')}
                active={theme === 'light'}
                onPress={() => setTheme('light')}
              />
              <PrefChip
                label={t('darkMode')}
                active={theme === 'dark'}
                onPress={() => setTheme('dark')}
              />
            </View>
          </View>
          <Text style={[styles.footer, { color: c.textMuted }]}>© {t('appName')}</Text>
          <Pressable onPress={doLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

function PrefChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useSettingsStore((s) => s.colors())
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? c.primary : c.border,
          backgroundColor: active ? c.primary : c.bg,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : c.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
  },
  brand: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20 },
  avatar: { borderWidth: 3, borderColor: '#ffffff' },
  brandName: { marginTop: 12, color: '#ffffff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  brandRole: { marginTop: 4, color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemMark: { width: 4, height: 22, borderRadius: 4 },
  itemText: { fontSize: 16, fontWeight: '600', flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#DC3B3B',
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  prefs: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12 },
  prefLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  prefRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 12 },
})
