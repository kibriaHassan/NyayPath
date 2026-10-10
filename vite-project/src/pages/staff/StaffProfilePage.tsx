import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { getStaffById, cases as mockCases } from '@/data/mock'
import { api, ApiError } from '@/lib/api'
import { fileToCompressedDataUrl } from '@/lib/imageUpload'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { Staff, StaffPermissions } from '@/types'

const labels: Record<keyof StaffPermissions, string> = {
  viewCases: 'View Cases',
  editCases: 'Edit Cases',
  addCase: 'Add Case',
  viewHearingDates: 'View Hearing Dates',
  editHearingDates: 'Edit Hearing Dates',
  manageDocuments: 'Manage Documents',
  addNotes: 'Add Notes',
  manageTasks: 'Manage Tasks',
}

export default function StaffProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateSessionUser = useAuthStore((s) => s.updateSessionUser)
  const [staff, setStaff] = useState<(Staff & { lawyerName?: string }) | null>(
    () => getStaffById(user?.id) || null,
  )
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(staff?.name || user?.name || '')
  const [mobile, setMobile] = useState(staff?.mobile || '')
  const [photo, setPhoto] = useState(staff?.photo || '')
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    api<{ data: Staff & { lawyerName?: string } }>('/staff/me')
      .then((res) => {
        setStaff(res.data)
        setName(res.data.name || '')
        setMobile(res.data.mobile || '')
        setPhoto(res.data.photo || '')
        updateSessionUser({
          staffCode: res.data.staffCode,
          active: res.data.active !== false,
          lawyerId: res.data.lawyerId || '',
        })
      })
      .catch(() => setStaff(getStaffById(user?.id) || null))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const saveProfile = async () => {
    setBusy('save')
    setMessage('')
    setPhotoError('')
    try {
      const res = await api<{ data: Staff & { lawyerName?: string } }>('/staff/me', {
        method: 'PUT',
        body: { name: name.trim(), mobile: mobile.trim(), photo },
      })
      setStaff(res.data)
      updateSessionUser({ name: name.trim(), photo })
      setEditing(false)
      setMessage('প্রোফাইল সংরক্ষণ হয়েছে।')
    } catch (e) {
      setPhotoError(e instanceof ApiError ? e.message : 'সংরক্ষণ ব্যর্থ')
    } finally {
      setBusy('')
    }
  }

  const leaveTeam = async () => {
    if (
      !confirm(
        'এই উকিলের সাথে আর কাজ করবেন না?\nঅ্যাসাইন মামলার তথ্য মুছে যাবে এবং উকিল নিজে পরিচালনা করবেন।',
      )
    )
      return
    setBusy('leave')
    setMessage('')
    try {
      await api('/staff/me/leave', { method: 'POST' })
      updateSessionUser({ lawyerId: '', active: false })
      setMessage('এই উকিলের টিম থেকে বেরিয়ে এসেছেন।')
      load()
    } catch (e) {
      const local = getStaffById(user?.id)
      if (local) {
        local.lawyerId = ''
        local.active = false
        for (const c of mockCases) {
          c.assignedStaffIds = c.assignedStaffIds.filter((id) => id !== local.id)
        }
        setStaff({ ...local })
        updateSessionUser({ lawyerId: '', active: false })
        setMessage('এই উকিলের টিম থেকে বেরিয়ে এসেছেন (লোকাল)।')
      } else {
        setMessage(e instanceof ApiError ? e.message : 'ব্যর্থ')
      }
    } finally {
      setBusy('')
    }
  }

  if (!staff) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">
          {user?.name}{' '}
          {user?.staffCode && (
            <span className="font-mono text-base font-semibold text-teal">{user.staffCode}</span>
          )}
        </h1>
        <p className="text-muted">
          আপনার ইউনিক Staff ID:{' '}
          <span className="font-mono font-semibold text-teal">{user?.staffCode || '—'}</span>
        </p>
      </div>
    )
  }

  const disabled = staff.active === false
  const linked = Boolean(staff.lawyerId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <img src={photo || staff.photo} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {editing ? 'My Profile' : staff.name}{' '}
              <span className="font-mono text-base font-semibold text-teal">{staff.staffCode}</span>
            </h1>
            <p className="text-sm text-muted">{staff.role}</p>
          </div>
          <Badge variant={disabled ? 'danger' : 'success'}>{disabled ? 'Disabled' : 'Active'}</Badge>
        </div>
        {!editing ? (
          <Button type="button" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            তথ্য পরিবর্তন
          </Button>
        ) : null}
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">প্রোফাইল আপডেট</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setPhotoError('')
                void fileToCompressedDataUrl(file)
                  .then(setPhoto)
                  .catch((err) => setPhotoError(err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ'))
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              ছবি পরিবর্তন
            </Button>
            <Input label="নাম" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="মোবাইল" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            {photoError ? <p className="text-sm text-danger">{photoError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy === 'save'} onClick={() => void saveProfile()}>
                {busy === 'save' ? 'সংরক্ষণ হচ্ছে...' : 'সেভ করুন'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName(staff.name)
                  setMobile(staff.mobile)
                  setPhoto(staff.photo)
                  setPhotoError('')
                  setEditing(false)
                }}
              >
                বাতিল
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {disabled && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          উকিল আপনার অ্যাক্সেস Disabled করেছেন — মামলা/টাস্ক ব্যবহার করা যাবে না। চাইলে নিচে থেকে এই
          উকিলের সাথে কাজ বন্ধ করতে পারবেন।
        </div>
      )}

      <div className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm">
        <p className="font-semibold text-ink">আপনার ইউনিক Staff ID</p>
        <p className="mt-1 font-mono text-lg font-semibold text-teal">{staff.staffCode}</p>
        <p className="mt-1 text-muted">
          এই ID, ইমেইল ({staff.email}) বা মোবাইল ({staff.mobile}) দিয়ে উকিল আপনাকে অ্যাড করতে পারবেন।
        </p>
        {linked ? (
          <p className="mt-2 text-ink">
            লিংকড উকিল: <span className="font-semibold">{staff.lawyerName || staff.lawyerId}</span>
          </p>
        ) : (
          <p className="mt-2 text-amber-800">এখনো কোনো উকিলের সাথে লিংক নেই।</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Contact</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {staff.email}</p>
            <p>Mobile: {staff.mobile}</p>
          </CardContent>
        </Card>
        <Card className={disabled ? 'pointer-events-none opacity-50' : undefined}>
          <CardHeader>
            <h2 className="font-semibold">Your Permissions</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof StaffPermissions)[]).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg bg-slate-panel px-3 py-2 text-sm"
              >
                <span>{labels[key]}</span>
                <Badge variant={staff.permissions?.[key] ? 'success' : 'muted'}>
                  {staff.permissions?.[key] ? 'Allowed' : 'Denied'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">এই উকিলে কাজ করব না</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
            এই অপশনে চাপলে বর্তমান উকিলের সাথে লিংক কেটে যাবে এবং অ্যাসাইন মামলার তথ্য আপনার আইডি থেকে
            মুছে যাবে। উকিল নিজে সেই মামলাগুলো পরিচালনা করবেন। আপনার Staff অ্যাকাউন্ট থাকবে — পরে অন্য
            উকিল আপনাকে যোগ করতে পারবেন।
          </p>
          {message && <p className="text-sm text-teal">{message}</p>}
          <Button variant="outline" disabled={busy !== '' || !linked} onClick={() => void leaveTeam()}>
            {busy === 'leave' ? 'প্রসেস হচ্ছে…' : 'এই উকিলে কাজ করব না'}
          </Button>
          {!linked && (
            <p className="text-xs text-muted">এখন কোনো উকিলের সাথে লিংক নেই।</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
