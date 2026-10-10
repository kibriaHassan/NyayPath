import { useEffect, useState } from 'react'
import { Switch, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SelectField } from '../components/ui/SelectField'
import { StatusPill } from '../components/ui/MenuRow'
import { SuccessToast } from '../components/ui/SuccessToast'
import { api, ApiError } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type PermKey =
  | 'viewCases'
  | 'editCases'
  | 'addCase'
  | 'viewHearingDates'
  | 'editHearingDates'
  | 'manageDocuments'
  | 'addNotes'
  | 'manageTasks'

const PERM_KEYS: PermKey[] = [
  'viewCases',
  'editCases',
  'addCase',
  'viewHearingDates',
  'editHearingDates',
  'manageDocuments',
  'addNotes',
  'manageTasks',
]

const DEFAULT_PERMS: Record<PermKey, boolean> = {
  viewCases: true,
  editCases: false,
  addCase: false,
  viewHearingDates: true,
  editHearingDates: false,
  manageDocuments: false,
  addNotes: true,
  manageTasks: false,
}

const ROLES = ['Case Manager', 'Legal Assistant', 'Office Assistant']

const PERM_LABELS: Record<'bn' | 'en', Record<PermKey, string>> = {
  bn: {
    viewCases: 'মামলা দেখা',
    editCases: 'মামলা এডিট',
    addCase: 'মামলা যোগ',
    viewHearingDates: 'শুনানির তারিখ দেখা',
    editHearingDates: 'শুনানির তারিখ এডিট',
    manageDocuments: 'ডকুমেন্ট',
    addNotes: 'নোট',
    manageTasks: 'টাস্ক',
  },
  en: {
    viewCases: 'View cases',
    editCases: 'Edit cases',
    addCase: 'Add case',
    viewHearingDates: 'View hearing dates',
    editHearingDates: 'Edit hearing dates',
    manageDocuments: 'Documents',
    addNotes: 'Notes',
    manageTasks: 'Tasks',
  },
}

type Staff = {
  id: string
  name: string
  email: string
  mobile?: string
  staffCode?: string
  role?: string
  active?: boolean
  permissions?: Record<string, boolean>
}

type Props = NativeStackScreenProps<RootStackParamList, 'StaffDetails'>

export function StaffDetailsScreen({ navigation, route }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const lang = useSettingsStore((s) => s.lang)
  const [staff, setStaff] = useState<Staff | null>((route.params.preview as Staff) || null)
  const [role, setRole] = useState(staff?.role || 'Legal Assistant')
  const [perms, setPerms] = useState<Record<PermKey, boolean>>({ ...DEFAULT_PERMS })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api<{ data: Staff }>(`/staff/${route.params.id}`)
      .then((res) => {
        const row = res.data
        setStaff(row)
        setRole(row.role || 'Legal Assistant')
        setPerms({ ...DEFAULT_PERMS, ...(row.permissions || {}) })
      })
      .catch(() => {})
  }, [route.params.id])

  const save = async () => {
    if (!staff) return
    setSaving(true)
    setError('')
    try {
      const res = await api<{ data: Staff }>(`/staff/${staff.id}`, {
        method: 'PATCH',
        body: { role, permissions: perms },
      })
      setStaff(res.data)
      setRole(res.data.role || role)
      setPerms({ ...DEFAULT_PERMS, ...(res.data.permissions || {}) })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  if (!staff) {
    return (
      <Screen>
        <ScreenHeader title={t('staff')} onBack={() => navigation.goBack()} />
        <Text style={{ color: c.textMuted }}>{t('loading')}</Text>
      </Screen>
    )
  }

  const labels = PERM_LABELS[lang === 'en' ? 'en' : 'bn']

  return (
    <Screen>
      <SuccessToast
        visible={success}
        title="Success"
        message="Staff updated successfully."
        onDone={() => setSuccess(false)}
      />
      <ScreenHeader title={staff.name} onBack={() => navigation.goBack()} />
      <AppCard style={{ marginBottom: 12 }}>
        <Text style={{ color: c.primary, fontWeight: '800', fontFamily: 'monospace' }}>
          {staff.staffCode}
        </Text>
        <Text style={{ color: c.textMuted, marginTop: 6 }}>{staff.email}</Text>
        <Text style={{ color: c.textMuted, marginTop: 4 }}>{staff.mobile || '—'}</Text>
        <StatusPill
          label={staff.active === false ? t('disabled') : t('active')}
          tone={staff.active === false ? 'danger' : 'success'}
        />
      </AppCard>

      <AppCard style={{ marginBottom: 12, gap: 10 }}>
        <SelectField
          label={t('staffRole')}
          value={ROLES.includes(role) ? role : 'Legal Assistant'}
          options={ROLES.map((item) => ({ value: item, label: item }))}
          onChange={setRole}
        />
      </AppCard>

      <AppCard style={{ marginBottom: 12 }}>
        <Text style={{ color: c.text, fontWeight: '800', marginBottom: 6 }}>{t('permissions')}</Text>
        {PERM_KEYS.map((key) => (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              gap: 12,
            }}
          >
            <Text style={{ color: c.text, flex: 1 }}>{labels[key]}</Text>
            <Switch
              value={Boolean(perms[key])}
              onValueChange={(on) => setPerms((prev) => ({ ...prev, [key]: on }))}
              trackColor={{ false: c.border, true: c.primary }}
            />
          </View>
        ))}
      </AppCard>

      {error ? (
        <Text style={{ color: c.danger, fontWeight: '700', marginBottom: 10 }}>{error}</Text>
      ) : null}
      <AppButton
        title={saving ? t('loading') : t('save')}
        onPress={() => void save()}
        disabled={saving}
        fullWidth
      />
    </Screen>
  )
}
