import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSettingsStore } from '../../store/settingsStore'
import type { AppColors } from '../../theme/colors'

export function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress: () => void
  danger?: boolean
}) {
  const c = useSettingsStore((s) => s.colors())
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: danger ? 'rgba(194,59,59,0.12)' : c.primarySoft }]}>
        <Ionicons name={icon} size={20} color={danger ? c.danger : c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? c.danger : c.text, fontWeight: '800' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  )
}

export function EmptyState({ text }: { text: string }) {
  const c = useSettingsStore((s) => s.colors())
  return (
    <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 28, paddingHorizontal: 24 }}>
      {text}
    </Text>
  )
}

export function StatusPill({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'danger' | 'success' | 'warning' }) {
  const c = useSettingsStore((s) => s.colors())
  const map: Record<string, { bg: string; fg: string }> = {
    primary: { bg: c.primarySoft, fg: c.primary },
    danger: { bg: 'rgba(194,59,59,0.12)', fg: c.danger },
    success: { bg: 'rgba(31,138,91,0.12)', fg: c.success },
    warning: { bg: 'rgba(208,144,32,0.14)', fg: c.warning },
  }
  const t = map[tone]
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
})
