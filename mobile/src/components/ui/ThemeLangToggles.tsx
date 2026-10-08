import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSettingsStore } from '../../store/settingsStore'

/** Compact theme + language toggles for headers */
export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const c = useSettingsStore((s) => s.colors())
  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={8}
      accessibilityLabel="Toggle theme"
      style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={c.text} />
    </Pressable>
  )
}

export function LangToggle() {
  const lang = useSettingsStore((s) => s.lang)
  const setLang = useSettingsStore((s) => s.setLang)
  const c = useSettingsStore((s) => s.colors())
  return (
    <Pressable
      onPress={() => setLang(lang === 'bn' ? 'en' : 'bn')}
      hitSlop={8}
      accessibilityLabel="Toggle language"
      style={[styles.chip, { backgroundColor: c.primarySoft, borderColor: c.border, minWidth: 46 }]}
    >
      <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>
        {lang === 'bn' ? 'EN' : 'বাং'}
      </Text>
    </Pressable>
  )
}

export function ThemeLangToggles() {
  return (
    <View style={styles.row}>
      <LangToggle />
      <ThemeToggle />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
})
