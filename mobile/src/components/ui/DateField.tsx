import { useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '../../store/settingsStore'
import { isCourtHoliday, toDateKey } from '../../utils/courtCalendar'

type Props = {
  label: string
  value: string
  onChange: (yyyyMmDd: string) => void
  required?: boolean
  error?: string
  placeholder?: string
  /** Clear the field when focused so a new date can be typed */
  clearOnFocus?: boolean
  /** Fri–Sat cannot be selected (court closed) */
  skipHolidays?: boolean
}

const BN_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const pad = first.getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < pad; i += 1) {
    cells.push({ date: new Date(year, month, 1 - (pad - i)), inMonth: false })
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev)
    next.setDate(prev.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
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
  clearOnFocus,
  skipHolidays,
}: Props) {
  const c = useSettingsStore((s) => s.colors())
  const insets = useSafeAreaInsets()
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => parseYmd(value) || new Date())

  const cells = useMemo(
    () => monthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )

  const openPicker = () => {
    setCursor(parseYmd(value) || new Date())
    setOpen(true)
  }

  const applyDate = (d: Date) => {
    if (skipHolidays && isCourtHoliday(d)) return
    onChange(toYmd(d))
    setOpen(false)
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
          onFocus={() => {
            setFocused(true)
            if (clearOnFocus && value) onChange('')
          }}
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
      {skipHolidays ? (
        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600' }}>
          শুক্রবার ও শনিবার আদালত বন্ধ — সেই তারিখ বেছে নেওয়া যাবে না
        </Text>
      ) : null}
      {error ? <Text style={{ color: c.danger, fontSize: 12 }}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
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
              <View style={{ width: 48 }} />
            </View>
            <View style={styles.calHead}>
              <Pressable
                onPress={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                hitSlop={8}
                style={styles.chev}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.calTitle}>
                {BN_MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <Pressable
                onPress={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                hitSlop={8}
                style={styles.chev}
              >
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {BN_DAYS.map((d) => (
                <Text key={d} style={[styles.weekLabel, { color: c.textMuted }]}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((cell) => {
                const key = toDateKey(cell.date)
                const holiday = skipHolidays && isCourtHoliday(cell.date)
                const selected = value === key
                const blocked = !cell.inMonth || holiday
                return (
                  <Pressable
                    key={key}
                    style={styles.cell}
                    disabled={blocked}
                    onPress={() => applyDate(cell.date)}
                  >
                    <View
                      style={[
                        styles.dayBubble,
                        holiday ? { backgroundColor: '#D1D5DB' } : null,
                        selected ? { backgroundColor: c.primary } : null,
                      ]}
                    >
                      <Text
                        style={{
                          color: !cell.inMonth
                            ? '#C5CDD6'
                            : selected || holiday
                              ? '#fff'
                              : c.text,
                          fontWeight: '700',
                          fontSize: 14,
                        }}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
            {skipHolidays ? (
              <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                ধূসর দিন = আদালত বন্ধ
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
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
  calHead: {
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 14,
  },
  chev: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  weekRow: { flexDirection: 'row', paddingTop: 12, paddingHorizontal: 10 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 8 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
