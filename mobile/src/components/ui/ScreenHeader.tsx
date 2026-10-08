import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSettingsStore } from '../../store/settingsStore'

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  leading,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  leading?: React.ReactNode
  right?: React.ReactNode
}) {
  const c = useSettingsStore((s) => s.colors())
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {leading}
        {onBack ? (
          <Pressable onPress={onBack} style={[styles.back, { borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 }} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
})
