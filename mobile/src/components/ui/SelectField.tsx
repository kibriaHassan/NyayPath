import { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '../../store/settingsStore'

export type SelectOption = { value: string; label: string }

type Props = {
  label: string
  value: string
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  /** Required field — shows red * on label */
  required?: boolean
  onChange: (value: string) => void
}

/**
 * Modal picker — avoids keyboard / nested-scroll shake from TextInput selects.
 */
export function SelectField({
  label,
  value,
  options,
  placeholder = 'নির্বাচন করুন',
  disabled,
  required,
  onChange,
}: Props) {
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label || '',
    [options, value],
  )

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.textMuted }]}>
        {label}
        {required ? <Text style={{ color: c.danger }}> *</Text> : null}
      </Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            backgroundColor: c.inputBg,
            borderColor: c.border,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: selectedLabel ? c.text : c.textMuted,
            fontWeight: selectedLabel ? '700' : '500',
            fontSize: 15,
          }}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: c.bgElevated,
                paddingBottom: Math.max(insets.bottom, 16),
                borderColor: c.border,
              },
            ]}
          >
            <View style={styles.sheetHead}>
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 17 }}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              ListHeaderComponent={
                <Pressable
                  onPress={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  style={[styles.option, { borderBottomColor: c.border }]}
                >
                  <Text style={{ color: c.textMuted, fontWeight: '600' }}>{placeholder}</Text>
                </Pressable>
              }
              ListEmptyComponent={
                <Text style={{ color: c.textMuted, textAlign: 'center', padding: 24 }}>
                  কোনো অপশন নেই
                </Text>
              }
              renderItem={({ item }) => {
                const active = item.value === value
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                    style={[
                      styles.option,
                      {
                        borderBottomColor: c.border,
                        backgroundColor: active ? c.primarySoft : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: active ? c.primary : c.text, fontWeight: active ? '800' : '600' }}>
                      {item.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={c.primary} /> : null}
                  </Pressable>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  field: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '72%',
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
