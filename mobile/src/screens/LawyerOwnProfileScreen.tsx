import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { Avatar } from '../components/ui/Avatar'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SelectField } from '../components/ui/SelectField'
import { SuccessToast } from '../components/ui/SuccessToast'
import { api, ApiError } from '../api/client'
import { useLocationOptions } from '../hooks/useBdLocations'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import { normalizePhotoUrl } from '../utils/avatar'
import { pickProfilePhoto } from '../utils/pickProfilePhoto'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'LawyerOwnProfile'>
type PracticeType = 'civil' | 'criminal' | 'both'

type Visibility = {
  enrollmentNumber: boolean
  mobile: boolean
  email: boolean
  chamberAddress: boolean
  bio: boolean
}

const EMPTY_VIS: Visibility = {
  enrollmentNumber: true,
  mobile: true,
  email: true,
  chamberAddress: true,
  bio: true,
}

type Draft = {
  fullName: string
  email: string
  mobile: string
  designation: string
  barAssociation: string
  enrollmentNumber: string
  practiceType: PracticeType
  years: string
  division: string
  district: string
  court: string
  chamberName: string
  chamberLocation: string
  chamberAddress: string
  bio: string
  photo: string
  publicEnabled: boolean
  visibility: Visibility
}

export function LawyerOwnProfileScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const updateUser = useAuthStore((s) => s.updateUser)
  const user = useAuthStore((s) => s.user)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [designation, setDesignation] = useState('')
  const [barAssociation, setBarAssociation] = useState('')
  const [enrollmentNumber, setEnrollmentNumber] = useState('')
  const [practiceType, setPracticeType] = useState<PracticeType>('both')
  const [years, setYears] = useState('')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [court, setCourt] = useState('')
  const [chamberName, setChamberName] = useState('')
  const [chamberLocation, setChamberLocation] = useState('')
  const [chamberAddress, setChamberAddress] = useState('')
  const [bio, setBio] = useState('')
  const [photo, setPhoto] = useState('')
  const [verified, setVerified] = useState(false)
  const [publicEnabled, setPublicEnabled] = useState(true)
  const [visibility, setVisibility] = useState<Visibility>(EMPTY_VIS)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const draftRef = useRef<Draft | null>(null)

  const currentDraft = (): Draft => ({
    fullName,
    email,
    mobile,
    designation,
    barAssociation,
    enrollmentNumber,
    practiceType,
    years,
    division,
    district,
    court,
    chamberName,
    chamberLocation,
    chamberAddress,
    bio,
    photo,
    publicEnabled,
    visibility,
  })

  const applyDraft = (d: Draft) => {
    setFullName(d.fullName)
    setEmail(d.email)
    setMobile(d.mobile)
    setDesignation(d.designation)
    setBarAssociation(d.barAssociation)
    setEnrollmentNumber(d.enrollmentNumber)
    setPracticeType(d.practiceType)
    setYears(d.years)
    setDivision(d.division)
    setDistrict(d.district)
    setCourt(d.court)
    setChamberName(d.chamberName)
    setChamberLocation(d.chamberLocation)
    setChamberAddress(d.chamberAddress)
    setBio(d.bio)
    setPhoto(d.photo)
    setPublicEnabled(d.publicEnabled)
    setVisibility(d.visibility)
  }

  const startEdit = () => {
    draftRef.current = currentDraft()
    setFormError('')
    setPhotoError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    if (draftRef.current) applyDraft(draftRef.current)
    setFormError('')
    setPhotoError('')
    setEditing(false)
  }

  const loc = useMemo(
    () => ({ division, district, courtType: '', court }),
    [division, district, court],
  )
  const { divisions, districtOptions, courtOptions } = useLocationOptions(loc)
  const courtChoices = useMemo(() => {
    const names = [...courtOptions]
    if (court && !names.includes(court)) names.unshift(court)
    return names
  }, [courtOptions, court])

  useEffect(() => {
    api<{ data: Record<string, unknown> }>('/profile/lawyer')
      .then((res) => {
        const d = res.data || {}
        const name = String(d.fullName || '')
        const nextPhoto = normalizePhotoUrl(String(d.photo || ''), name || user?.name)
        setFullName(name)
        setEmail(String(d.email || user?.email || ''))
        setMobile(String(d.mobile || ''))
        setDesignation(String(d.designation || ''))
        setBarAssociation(String(d.barAssociation || ''))
        setEnrollmentNumber(String(d.enrollmentNumber || ''))
        const pt = String(d.practiceType || 'both')
        setPracticeType(pt === 'civil' || pt === 'criminal' ? pt : 'both')
        setYears(String(d.yearsOfExperience ?? ''))
        setDivision(String(d.division || ''))
        setDistrict(String(d.district || ''))
        setCourt(String(d.court || ''))
        setChamberName(String(d.chamberName || ''))
        setChamberLocation(String(d.chamberLocation || ''))
        setChamberAddress(String(d.chamberAddress || ''))
        setBio(String(d.bio || ''))
        setPhoto(String(d.photo || '') || nextPhoto)
        setVerified(Boolean(d.verified))
        setPublicEnabled(d.publicProfileEnabled !== false)
        if (d.visibility && typeof d.visibility === 'object') {
          setVisibility({ ...EMPTY_VIS, ...(d.visibility as Visibility) })
        }
        updateUser({ name: name || user?.name, photo: String(d.photo || '') || nextPhoto })
      })
      .catch(() => {
        setFullName(user?.name || '')
        setEmail(user?.email || '')
        setPhoto(user?.photo || '')
      })
  }, [user?.id])

  const choosePhoto = async () => {
    setPhotoError('')
    const picked = await pickProfilePhoto()
    if (!picked.ok) {
      if (!picked.cancelled && picked.error) setPhotoError(picked.error)
      return
    }
    setPhoto(picked.dataUrl)
  }

  const resetPhoto = () => {
    setPhoto(normalizePhotoUrl('', fullName || 'NP'))
  }

  const save = async () => {
    setFormError('')
    if (!fullName.trim()) {
      setFormError(t('fillRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        designation: designation.trim(),
        barAssociation: barAssociation.trim(),
        enrollmentNumber: enrollmentNumber.trim(),
        practiceType,
        practiceAreas:
          practiceType === 'civil'
            ? ['সিভিল']
            : practiceType === 'criminal'
              ? ['ফৌজদারি']
              : ['সিভিল', 'ফৌজদারি'],
        yearsOfExperience: Number(years) || 0,
        division,
        district,
        court: court.trim(),
        chamberName: chamberName.trim(),
        chamberAddress: chamberAddress.trim(),
        chamberLocation: chamberLocation.trim(),
        bio: bio.trim(),
        photo,
        publicProfileEnabled: publicEnabled,
        visibility,
      }
      await api('/profile/lawyer', { method: 'PUT', body: payload })
      updateUser({ name: payload.fullName, photo })
      setEditing(false)
      setSuccess(true)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  const practiceOptions: { value: PracticeType; label: string }[] = [
    { value: 'civil', label: t('practiceCivil') },
    { value: 'criminal', label: t('practiceCriminal') },
    { value: 'both', label: t('practiceBoth') },
  ]

  const visibilityRows: { key: keyof Visibility; label: string }[] = [
    { key: 'enrollmentNumber', label: t('enrollment') },
    { key: 'mobile', label: t('mobile') },
    { key: 'email', label: t('email') },
    { key: 'chamberAddress', label: t('chamberAddress') },
    { key: 'bio', label: t('bio') },
  ]

  const practiceLabel = practiceOptions.find((opt) => opt.value === practiceType)?.label || ''

  return (
    <Screen>
      <SuccessToast
        visible={success}
        title="Success"
        message="Profile saved successfully."
        onDone={() => setSuccess(false)}
      />
      <ScreenHeader
        title={t('profile')}
        subtitle={editing ? t('photoHint') : undefined}
        onBack={() => navigation.goBack()}
        right={
          editing ? undefined : (
            <Pressable
              onPress={startEdit}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: c.primary,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('editProfile')}</Text>
            </Pressable>
          )
        }
      />

      <AppCard style={{ alignItems: 'center', marginBottom: 12, gap: 10 }}>
        {editing ? (
          <Text style={{ alignSelf: 'flex-start', color: c.text, fontWeight: '800' }}>{t('editPhoto')}</Text>
        ) : null}
        <Avatar uri={photo} name={fullName || user?.name} size={104} radius={28} />
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 20 }}>{fullName || user?.name}</Text>
        {verified ? (
          <Text style={{ color: c.success, fontWeight: '800', fontSize: 12 }}>{t('verified')}</Text>
        ) : null}
        {editing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AppButton title={t('pickPhoto')} onPress={() => void choosePhoto()} />
            <AppButton title={t('defaultPhoto')} variant="outline" onPress={resetPhoto} />
          </View>
        ) : null}
        {photoError ? <Text style={{ color: c.danger, fontWeight: '700' }}>{photoError}</Text> : null}
      </AppCard>

      {!editing ? (
        <>
          <AppCard style={{ gap: 4, marginBottom: 12 }}>
            <Text style={{ color: c.text, fontWeight: '800', marginBottom: 6 }}>{t('basicSection')}</Text>
            <InfoRow label={t('email')} value={email} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('mobile')} value={mobile} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('designation')} value={designation} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('barAssociation')} value={barAssociation} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('enrollment')} value={enrollmentNumber} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('yearsExperience')} value={years} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('practiceType')} value={practiceLabel} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('bio')} value={bio} muted={c.textMuted} text={c.text} />
          </AppCard>
          <AppCard style={{ gap: 4, marginBottom: 12 }}>
            <Text style={{ color: c.text, fontWeight: '800', marginBottom: 6 }}>{t('locationSection')}</Text>
            <InfoRow label={t('division')} value={division} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('district')} value={district} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('court')} value={court} muted={c.textMuted} text={c.text} />
          </AppCard>
          <AppCard style={{ gap: 4, marginBottom: 12 }}>
            <Text style={{ color: c.text, fontWeight: '800', marginBottom: 6 }}>{t('chamberSection')}</Text>
            <InfoRow label={t('chamber')} value={chamberName} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('chamberLocation')} value={chamberLocation} muted={c.textMuted} text={c.text} />
            <InfoRow label={t('chamberAddress')} value={chamberAddress} muted={c.textMuted} text={c.text} />
          </AppCard>
          <AppCard style={{ marginBottom: 12 }}>
            <Text style={{ color: c.text, fontWeight: '800' }}>{t('publicProfile')}</Text>
            <Text style={{ color: c.textMuted, marginTop: 6 }}>
              {publicEnabled ? t('publicProfileOn') : '—'}
            </Text>
          </AppCard>
        </>
      ) : null}

      {editing ? (
        <>

      <AppCard style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: c.text, fontWeight: '800' }}>{t('basicSection')}</Text>
        <AppInput label={t('fullName')} required value={fullName} onChangeText={setFullName} />
        <AppInput label={t('email')} value={email} editable={false} />
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: -6 }}>{t('emailLocked')}</Text>
        <AppInput label={t('mobile')} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <AppInput label={t('designation')} value={designation} onChangeText={setDesignation} />
        <AppInput label={t('barAssociation')} value={barAssociation} onChangeText={setBarAssociation} />
        <AppInput label={t('enrollment')} value={enrollmentNumber} onChangeText={setEnrollmentNumber} />
        <AppInput
          label={t('yearsExperience')}
          value={years}
          onChangeText={setYears}
          keyboardType="number-pad"
        />
        <Text style={{ color: c.text, fontWeight: '700' }}>{t('practiceType')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {practiceOptions.map((opt) => {
            const active = practiceType === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPracticeType(opt.value)}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? c.primary : c.card,
                }}
              >
                <Text
                  style={{
                    color: active ? '#fff' : c.text,
                    fontWeight: '800',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <AppInput label={t('bio')} value={bio} onChangeText={setBio} multiline />
      </AppCard>

      <AppCard style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: c.text, fontWeight: '800' }}>{t('locationSection')}</Text>
        <SelectField
          label={t('division')}
          value={division}
          placeholder={t('selectDivision')}
          options={divisions.map((d) => ({ value: d.name, label: d.name }))}
          onChange={(next) => {
            setDivision(next)
            setDistrict('')
            setCourt('')
          }}
        />
        <SelectField
          label={t('district')}
          value={district}
          disabled={!division}
          placeholder={division ? t('selectDistrict') : t('selectDivisionFirst')}
          options={districtOptions.map((name) => ({ value: name, label: name }))}
          onChange={(next) => {
            setDistrict(next)
            setCourt('')
          }}
        />
        <SelectField
          label={t('court')}
          value={court}
          disabled={!district}
          placeholder={district ? t('selectCourt') : t('selectDistrictFirst')}
          options={courtChoices.map((name) => ({ value: name, label: name }))}
          onChange={setCourt}
        />
      </AppCard>

      <AppCard style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: c.text, fontWeight: '800' }}>{t('chamberSection')}</Text>
        <AppInput label={t('chamber')} value={chamberName} onChangeText={setChamberName} />
        <AppInput label={t('chamberLocation')} value={chamberLocation} onChangeText={setChamberLocation} />
        <AppInput
          label={t('chamberAddress')}
          value={chamberAddress}
          onChangeText={setChamberAddress}
          multiline
        />
      </AppCard>

      <AppCard style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.text, fontWeight: '800', flex: 1 }}>{t('publicProfile')}</Text>
          <Switch value={publicEnabled} onValueChange={setPublicEnabled} trackColor={{ true: c.primary }} />
        </View>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('publicProfileOn')}</Text>
        {visibilityRows.map((row) => (
          <View
            key={row.key}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ color: c.text }}>{row.label}</Text>
            <Switch
              value={visibility[row.key]}
              onValueChange={(on) => setVisibility((prev) => ({ ...prev, [row.key]: on }))}
              trackColor={{ true: c.primary }}
            />
          </View>
        ))}
      </AppCard>

      {formError ? (
        <Text style={{ color: c.danger, fontWeight: '700', marginBottom: 8 }}>{formError}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppButton title={t('cancel')} variant="outline" onPress={cancelEdit} fullWidth />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            title={saving ? t('loading') : t('save')}
            onPress={() => void save()}
            disabled={saving}
            fullWidth
          />
        </View>
      </View>
        </>
      ) : null}
    </Screen>
  )
}

function InfoRow({
  label,
  value,
  muted,
  text,
}: {
  label: string
  value: string
  muted: string
  text: string
}) {
  return (
    <View style={{ paddingVertical: 6 }}>
      <Text style={{ color: muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: text, fontWeight: '700', marginTop: 2 }}>{value.trim() ? value : '—'}</Text>
    </View>
  )
}
