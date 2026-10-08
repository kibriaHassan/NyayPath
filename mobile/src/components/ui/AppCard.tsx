import { StyleSheet, Text, View, type ViewProps } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'

export function AppCard({ style, children, ...props }: ViewProps) {
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          shadowOpacity: theme === 'dark' ? 0.35 : 0.08,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

export function MetricChip({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  const c = useSettingsStore((s) => s.colors())
  return (
    <AppCard style={styles.metric}>
      <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', marginTop: 8 }}>{value}</Text>
      <View style={[styles.metricBar, { backgroundColor: c.primary }]} />
    </AppCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#071820',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    overflow: 'hidden',
  },
  metricBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
})
