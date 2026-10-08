import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSettingsStore } from '../../store/settingsStore'

type Props = TextInputProps & {
  label?: string
  error?: string
  /** Required field — shows red * on label */
  required?: boolean
  /** When true, shows eye toggle to reveal password */
  isPassword?: boolean
}

export function AppInput({
  label,
  error,
  required,
  style,
  isPassword,
  secureTextEntry,
  multiline,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const c = useSettingsStore((s) => s.colors())
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const passwordMode = Boolean(isPassword || secureTextEntry)

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: c.textMuted }]}>
          {label}
          {required ? <Text style={{ color: c.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : null,
          {
            backgroundColor: c.inputBg,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
          },
        ]}
      >
        <TextInput
          {...props}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : props.textAlignVertical}
          placeholderTextColor={c.textMuted}
          style={[styles.input, multiline ? styles.inputMultiline : null, { color: c.text }, style]}
          secureTextEntry={passwordMode ? !visible : false}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
        {passwordMode ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            style={styles.eye}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={c.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: c.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  field: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 12,
  },
  eye: { paddingLeft: 8, paddingVertical: 8 },
})
