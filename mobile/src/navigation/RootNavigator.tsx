import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppDrawerHost, AppMenuButton } from '../components/nav/AppDrawer'
import { useSettingsStore, useT } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import type {
  LawyerTabParamList,
  PublicTabParamList,
  RootStackParamList,
  StaffTabParamList,
} from './types'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { PublicHomeScreen } from '../screens/PublicHomeScreen'
import { CaseSearchScreen } from '../screens/CaseSearchScreen'
import { LawyersScreen } from '../screens/LawyersScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { CasesScreen } from '../screens/CasesScreen'
import { CaseDetailsScreen } from '../screens/CaseDetailsScreen'
import { CaseFormScreen } from '../screens/CaseFormScreen'
import { LawyerProfileScreen } from '../screens/LawyerProfileScreen'
import { LawyerOwnProfileScreen } from '../screens/LawyerOwnProfileScreen'
import { StaffProfileScreen } from '../screens/StaffProfileScreen'
import { DayCasesScreen } from '../screens/DayCasesScreen'
import { CaseCalendarScreen } from '../screens/CaseCalendarScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { DocumentsScreen } from '../screens/DocumentsScreen'
import { StaffListScreen } from '../screens/StaffListScreen'
import { StaffDetailsScreen } from '../screens/StaffDetailsScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()
const PublicTabsNav = createBottomTabNavigator<PublicTabParamList>()
const LawyerTabsNav = createBottomTabNavigator<LawyerTabParamList>()
const StaffTabsNav = createBottomTabNavigator<StaffTabParamList>()

function useNavTheme() {
  const theme = useSettingsStore((s) => s.theme)
  const c = useSettingsStore((s) => s.colors())
  const base = theme === 'dark' ? DarkTheme : DefaultTheme
  return {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.card,
      text: c.text,
      border: c.border,
      primary: c.primary,
      notification: c.accent,
    },
  }
}

function tabIcon(map: Record<string, keyof typeof Ionicons.glyphMap>, name: string, color: string, size: number) {
  return <Ionicons name={map[name] || 'ellipse'} size={size} color={color} />
}

function PublicTabNavigator() {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  return (
    <PublicTabsNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) =>
          tabIcon(
            {
              Home: 'home-outline',
              CaseSearch: 'search-outline',
              Lawyers: 'people-outline',
              Settings: 'settings-outline',
            },
            route.name,
            color,
            size,
          ),
      })}
    >
      <PublicTabsNav.Screen name="Home" component={PublicHomeScreen} options={{ title: t('home') }} />
      <PublicTabsNav.Screen
        name="CaseSearch"
        component={CaseSearchScreen}
        options={{ title: t('searchCase') }}
      />
      <PublicTabsNav.Screen
        name="Lawyers"
        component={LawyersScreen}
        options={{ title: t('findLawyer') }}
      />
      <PublicTabsNav.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
    </PublicTabsNav.Navigator>
  )
}

function LawyerTabNavigator() {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  return (
    <AppDrawerHost>
    <LawyerTabsNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) =>
          tabIcon(
            {
              Dashboard: 'grid-outline',
              Cases: 'briefcase-outline',
              CaseCalendar: 'calendar-number-outline',
              DayCases: 'today-outline',
            },
            route.name,
            color,
            size,
          ),
      })}
    >
      <LawyerTabsNav.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboard') }} />
      <LawyerTabsNav.Screen name="Cases" component={CasesScreen} options={{ title: t('cases') }} />
      <LawyerTabsNav.Screen name="CaseCalendar" component={CaseCalendarScreen} options={{ title: t('caseCalendar') }} />
      <LawyerTabsNav.Screen name="DayCases" component={DayCasesScreen} options={{ title: t('dayCases') }} />
    </LawyerTabsNav.Navigator>
    </AppDrawerHost>
  )
}

function StaffBlockedView() {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <AppMenuButton />
      </View>
      <Text style={{ color: c.danger, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
        {t('accountBlocked')}
      </Text>
      <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
        {t('accountBlockedHint')}
      </Text>
      <Text style={{ color: c.primary, textAlign: 'center', marginTop: 16, fontWeight: '700' }}>
        {t('profile')} / {t('leaveLawyer')}
      </Text>
    </View>
  )
}

function withStaffGuard<P extends object>(Screen: React.ComponentType<P>) {
  return function Guarded(props: P) {
    const user = useAuthStore((s) => s.user)
    if (user?.role === 'STAFF' && user.active === false) return <StaffBlockedView />
    return <Screen {...props} />
  }
}

const GuardedDashboard = withStaffGuard(DashboardScreen)
const GuardedCases = withStaffGuard(CasesScreen)
const GuardedDayCases = withStaffGuard(DayCasesScreen)
const GuardedCalendar = withStaffGuard(CaseCalendarScreen)

function StaffTabNavigator() {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())

  return (
    <AppDrawerHost>
    <StaffTabsNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) =>
          tabIcon(
            {
              Dashboard: 'grid-outline',
              Cases: 'briefcase-outline',
              CaseCalendar: 'calendar-number-outline',
              DayCases: 'today-outline',
            },
            route.name,
            color,
            size,
          ),
      })}
    >
      <StaffTabsNav.Screen name="Dashboard" component={GuardedDashboard} options={{ title: t('dashboard') }} />
      <StaffTabsNav.Screen name="Cases" component={GuardedCases} options={{ title: t('cases') }} />
      <StaffTabsNav.Screen name="CaseCalendar" component={GuardedCalendar} options={{ title: t('caseCalendar') }} />
      <StaffTabsNav.Screen name="DayCases" component={GuardedDayCases} options={{ title: t('dayCases') }} />
    </StaffTabsNav.Navigator>
    </AppDrawerHost>
  )
}

function authSessionKey(user: ReturnType<typeof useAuthStore.getState>['user']) {
  if (!user) return 'guest'
  return `${user.role}:${user.id}`
}

function initialRouteFor(user: ReturnType<typeof useAuthStore.getState>['user']): keyof RootStackParamList {
  if (!user) return 'Welcome'
  if (user.role === 'LAWYER') return 'LawyerTabs'
  if (user.role === 'STAFF') return 'StaffTabs'
  return 'PublicTabs'
}

export function RootNavigator() {
  const navTheme = useNavTheme()
  const ready = useAuthStore((s) => s.ready)
  const user = useAuthStore((s) => s.user)
  const hydrated = useSettingsStore((s) => s.hydrated)
  const c = useSettingsStore((s) => s.colors())

  if (!ready || !hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    )
  }

  const sessionKey = authSessionKey(user)
  const initial = initialRouteFor(user)

  return (
    <NavigationContainer key={sessionKey} theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initial}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 180,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          detachPreviousScreen: false,
          freezeOnBlur: true,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="PublicTabs" component={PublicTabNavigator} />
        <Stack.Screen name="LawyerTabs" component={LawyerTabNavigator} />
        <Stack.Screen name="StaffTabs" component={StaffTabNavigator} />
        <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
        <Stack.Screen name="CaseForm" component={CaseFormScreen} />
        <Stack.Screen name="LawyerProfile" component={LawyerProfileScreen} />
        <Stack.Screen name="LawyerOwnProfile" component={LawyerOwnProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Tasks" component={TasksScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="StaffList" component={StaffListScreen} />
        <Stack.Screen name="StaffDetails" component={StaffDetailsScreen} />
        <Stack.Screen name="StaffProfile" component={StaffProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
