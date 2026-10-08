import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSettingsStore } from '../../store/settingsStore'

type Props = {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  fullWidth?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  fullWidth,
  disabled,
  style,
}: Props) {
  const c = useSettingsStore((s) => s.colors())
  const theme = useSettingsStore((s) => s.theme)

  if (variant === 'primary') {
    const colors =
      theme === 'dark'
        ? (['#1a8a96', '#146a74'] as const)
        : (['#0d3a44', '#146a74'] as const)
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          { alignSelf: fullWidth ? 'stretch' : 'auto', opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
          style,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[...colors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.elevated]}
        >
          <Text style={[styles.text, { color: '#fff' }]}>{title}</Text>
        </LinearGradient>
      </Pressable>
    )
  }

  const bg =
    variant === 'secondary'
      ? c.primary
      : variant === 'danger'
        ? c.danger
        : 'transparent'

  const border =
    variant === 'outline' ? c.border : variant === 'ghost' ? 'transparent' : bg

  const color =
    variant === 'outline' || variant === 'ghost' ? c.text : '#ffffff'

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color }]}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevated: {
    borderWidth: 0,
    shadowColor: '#0a1a22',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
