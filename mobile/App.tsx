import { useEffect } from 'react'
import { Platform, StatusBar as RNStatusBar } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { RootNavigator } from './src/navigation/RootNavigator'
import { bindAuthToken, bindUnauthorizedHandler } from './src/api/client'
import { useAuthStore } from './src/store/authStore'
import { useSettingsStore } from './src/store/settingsStore'

bindAuthToken(() => useAuthStore.getState().token)
bindUnauthorizedHandler(() => {
  void useAuthStore.getState().invalidateSession()
})

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const theme = useSettingsStore((s) => s.theme)
  const c = useSettingsStore((s) => s.colors())

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    RNStatusBar.setTranslucent(true)
    RNStatusBar.setBackgroundColor(c.bg)
    RNStatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content')
  }, [theme, c.bg])

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  )
}
