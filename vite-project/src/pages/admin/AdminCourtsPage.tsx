import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

type Division = { id: string; name: string; districts: string[] }
type CourtType = { id: string; value: string; label: string }
type CourtEntry = {
  id: string
  division: string
  district: string
  courtType: string
  courtName: string
}

export default function AdminCourtsPage() {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [courtTypes, setCourtTypes] = useState<CourtType[]>([])
  const [courts, setCourts] = useState<CourtEntry[]>([])
  const [error, setError] = useState('')
  const [filterDivision, setFilterDivision] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterType, setFilterType] = useState('')

  const [typeLabel, setTypeLabel] = useState('')
  const [typeValue, setTypeValue] = useState('')

  const [courtForm, setCourtForm] = useState({
    division: '',
    district: '',
    courtType: '',
    courtName: '',
  })

  const [newDivision, setNewDivision] = useState('')
  const [newDistrictDiv, setNewDistrictDiv] = useState('')
  const [newDistrict, setNewDistrict] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await api<{
        data: { divisions: Division[]; courtTypes: CourtType[]; courts: CourtEntry[] }
      }>('/admin/courts')
      setDivisions(res.data.divisions)
      setCourtTypes(res.data.courtTypes)
      setCourts(res.data.courts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'লোড ব্যর্থ')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const districtOptions = useMemo(() => {
    const div = divisions.find((d) => d.name === (courtForm.division || filterDivision))
    return div?.districts || []
  }, [divisions, courtForm.division, filterDivision])

  const filteredCourts = useMemo(() => {
    return courts.filter((c) => {
      if (filterDivision && c.division !== filterDivision) return false
      if (filterDistrict && c.district !== filterDistrict) return false
      if (filterType && c.courtType !== filterType) return false
      return true
    })
  }, [courts, filterDivision, filterDistrict, filterType])

  const typeLabelOf = (value: string) => courtTypes.find((t) => t.value === value)?.label || value

  const addType = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('/admin/court-types', {
        method: 'POST',
        body: { label: typeLabel, value: typeValue || typeLabel },
      })
      setTypeLabel('')
      setTypeValue('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'যোগ ব্যর্থ')
    }
  }

  const deleteType = async (id: string, label: string) => {
    if (!confirm(`"${label}" ধরন ডিলিট করবেন?`)) return
    try {
      await api(`/admin/court-types/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ডিলিট ব্যর্থ')
    }
  }

  const addCourt = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('/admin/courts', { method: 'POST', body: courtForm })
      setCourtForm((f) => ({ ...f, courtName: '' }))
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'যোগ ব্যর্থ')
    }
  }

  const deleteCourt = async (id: string, name: string) => {
    if (!confirm(`"${name}" ডিলিট করবেন?`)) return
    try {
      await api(`/admin/courts/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ডিলিট ব্যর্থ')
    }
  }

  const addDivision = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('/admin/divisions', { method: 'POST', body: { name: newDivision } })
      setNewDivision('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'যোগ ব্যর্থ')
    }
  }

  const addDistrict = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('/admin/districts', {
        method: 'POST',
        body: { division: newDistrictDiv, district: newDistrict },
      })
      setNewDistrict('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'যোগ ব্যর্থ')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">আদালত ক্যাটালগ</h1>
        <p className="mt-1 text-sm text-muted">
          বিভাগ, জেলা, আদালতের ধরন ও আদালত যোগ/ডিলিট — পাবলিক সার্চ ও কেস এন্ট্রিতে প্রতিফলিত হবে।
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold text-ink">আদালতের ধরন</h2>
          <form onSubmit={addType} className="mt-3 grid gap-2 sm:grid-cols-3">
            <Input label="লেবেল" value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} required />
            <Input
              label="Value (english key)"
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              placeholder="district_judge"
            />
            <div className="flex items-end">
              <Button type="submit" fullWidth>
                <Plus className="h-4 w-4" /> যোগ
              </Button>
            </div>
          </form>
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
            {courtTypes.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <span>
                  {t.label} <span className="text-xs text-muted">({t.value})</span>
                </span>
                <Button size="sm" variant="danger" onClick={() => void deleteType(t.id, t.label)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold text-ink">বিভাগ / জেলা</h2>
          <form onSubmit={addDivision} className="mt-3 flex gap-2">
            <Input
              label="নতুন বিভাগ"
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit">যোগ</Button>
            </div>
          </form>
          <form onSubmit={addDistrict} className="mt-3 grid gap-2 sm:grid-cols-3">
            <Select
              label="বিভাগ"
              value={newDistrictDiv}
              onChange={(e) => setNewDistrictDiv(e.target.value)}
              options={divisions.map((d) => ({ value: d.name, label: d.name }))}
              required
            />
            <Input
              label="নতুন জেলা"
              value={newDistrict}
              onChange={(e) => setNewDistrict(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit" fullWidth>
                জেলা যোগ
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted">
            {divisions.length} বিভাগ · {divisions.reduce((n, d) => n + d.districts.length, 0)} জেলা
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold text-ink">নতুন আদালত যোগ করুন</h2>
        <form onSubmit={addCourt} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="বিভাগ"
            value={courtForm.division}
            options={divisions.map((d) => ({ value: d.name, label: d.name }))}
            onChange={(e) =>
              setCourtForm((f) => ({ ...f, division: e.target.value, district: '' }))
            }
            required
          />
          <Select
            label="জেলা"
            value={courtForm.district}
            disabled={!courtForm.division}
            options={(divisions.find((d) => d.name === courtForm.division)?.districts || []).map(
              (d) => ({ value: d, label: d }),
            )}
            onChange={(e) => setCourtForm((f) => ({ ...f, district: e.target.value }))}
            required
          />
          <Select
            label="ধরন"
            value={courtForm.courtType}
            options={courtTypes.map((t) => ({ value: t.value, label: t.label }))}
            onChange={(e) => setCourtForm((f) => ({ ...f, courtType: e.target.value }))}
            required
          />
          <Input
            label="আদালতের নাম"
            value={courtForm.courtName}
            onChange={(e) => setCourtForm((f) => ({ ...f, courtName: e.target.value }))}
            required
          />
          <div className="flex items-end">
            <Button type="submit" fullWidth>
              <Plus className="h-4 w-4" /> আদালত যোগ
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-semibold text-ink">আদালত তালিকা ({filteredCourts.length})</h2>
          <div className="grid w-full gap-2 sm:max-w-2xl sm:grid-cols-3">
            <Select
              label="ফিল্টার বিভাগ"
              value={filterDivision}
              placeholder="সব"
              options={divisions.map((d) => ({ value: d.name, label: d.name }))}
              onChange={(e) => {
                setFilterDivision(e.target.value)
                setFilterDistrict('')
              }}
            />
            <Select
              label="ফিল্টার জেলা"
              value={filterDistrict}
              placeholder="সব"
              disabled={!filterDivision}
              options={districtOptions.map((d) => ({ value: d, label: d }))}
              onChange={(e) => setFilterDistrict(e.target.value)}
            />
            <Select
              label="ফিল্টার ধরন"
              value={filterType}
              placeholder="সব"
              options={courtTypes.map((t) => ({ value: t.value, label: t.label }))}
              onChange={(e) => setFilterType(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-mist/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">আদালত</th>
                <th className="px-4 py-3 font-semibold">লোকেশন</th>
                <th className="px-4 py-3 font-semibold">ধরন</th>
                <th className="px-4 py-3 font-semibold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourts.slice(0, 200).map((c) => (
                <tr key={c.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{c.courtName}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.division} · {c.district}
                  </td>
                  <td className="px-4 py-3">{typeLabelOf(c.courtType)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="danger" onClick={() => void deleteCourt(c.id, c.courtName)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredCourts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    কোনো আদালত নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredCourts.length > 200 && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted">
              প্রথম ২০০টি দেখানো হচ্ছে — ফিল্টার ব্যবহার করুন।
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
