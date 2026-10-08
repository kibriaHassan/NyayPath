import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children?: React.ReactNode
  scroll?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const insets = useSafeAreaInsets()
  const c = useSettingsStore((s) => s.colors())
  const pad: ViewStyle = {
    paddingTop: insets.top + 12,
    paddingBottom: insets.bottom + 24,
    paddingHorizontal: 20,
    backgroundColor: c.bg,
    flexGrow: 1,
  }

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[pad, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    )
  }

  return <View style={[{ flex: 1, backgroundColor: c.bg }, pad, style]}>{children}</View>
}

export const gap = StyleSheet.create({
  sm: { gap: 8 },
  md: { gap: 12 },
  lg: { gap: 18 },
})
