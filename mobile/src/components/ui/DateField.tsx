import { useMemo, useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '../../store/settingsStore'

type Props = {
  label: string
  value: string
  onChange: (yyyyMmDd: string) => void
  required?: boolean
  error?: string
  placeholder?: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseYmd(raw: string): Date | null {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(y, mo, day)
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null
  return d
}

/** Sanitize typed date: digits and dashes only, max YYYY-MM-DD length */
function sanitizeDateInput(raw: string): string {
  return String(raw || '')
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[\/.]/g, '-')
    .replace(/[^\d-]/g, '')
    .slice(0, 10)
}

export function DateField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder = 'YYYY-MM-DD',
}: Props) {
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(() => parseYmd(value) || new Date())

  const pickerValue = useMemo(() => parseYmd(value) || draft || new Date(), [value, draft])

  const openPicker = () => {
    setDraft(parseYmd(value) || new Date())
    setOpen(true)
  }

  const applyDate = (d: Date) => {
    onChange(toYmd(d))
    setDraft(d)
  }

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false)
      if (event.type === 'dismissed') return
      if (selected) applyDate(selected)
      return
    }
    if (selected) setDraft(selected)
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.textMuted }]}>
        {label}
        {required ? <Text style={{ color: c.danger }}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: c.inputBg,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(text) => onChange(sanitizeDateInput(text))}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, { color: c.text }]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable
          onPress={openPicker}
          hitSlop={10}
          accessibilityLabel="Select date"
          style={styles.iconBtn}
        >
          <Ionicons name="calendar-outline" size={22} color={c.primary} />
        </Pressable>
      </View>
      {error ? <Text style={{ color: c.danger, fontSize: 12 }}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: c.bgElevated,
                  borderColor: c.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.sheetHead}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={{ color: c.textMuted, fontWeight: '700' }}>বাতিল</Text>
                </Pressable>
                <Text style={{ color: c.text, fontWeight: '800' }}>{label}</Text>
                <Pressable
                  onPress={() => {
                    applyDate(draft)
                    setOpen(false)
                  }}
                  hitSlop={10}
                >
                  <Text style={{ color: c.primary, fontWeight: '800' }}>ঠিক আছে</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={onPickerChange}
                themeVariant="light"
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Web / other: simple modal with Android-style confirm */}
      {open && Platform.OS === 'web' ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: c.bgElevated,
                  borderColor: c.border,
                  paddingBottom: 16,
                },
              ]}
            >
              <View style={styles.sheetHead}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={{ color: c.textMuted, fontWeight: '700' }}>বাতিল</Text>
                </Pressable>
                <Text style={{ color: c.text, fontWeight: '800' }}>{label}</Text>
                <Pressable
                  onPress={() => {
                    applyDate(draft)
                    setOpen(false)
                  }}
                  hitSlop={10}
                >
                  <Text style={{ color: c.primary, fontWeight: '800' }}>ঠিক আছে</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  if (selected) setDraft(selected)
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  iconBtn: { paddingLeft: 8, paddingVertical: 8 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
})
