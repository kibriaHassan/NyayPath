import { useEffect, useMemo, useState } from 'react'
import { documents, cases } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Case, CaseDocument, Staff } from '@/types'

export default function DocumentsPage({ forStaff = false }: { forStaff?: boolean }) {
  const user = useAuthStore((s) => s.user)
  const myCaseIds = useMemo(() => {
    if (user?.role === 'LAWYER') {
      return new Set(cases.filter((c) => c.ownerLawyerId === user.id).map((c) => c.id))
    }
    if (user?.role === 'STAFF') {
      return new Set(cases.filter((c) => c.assignedStaffIds.includes(user.id)).map((c) => c.id))
    }
    return new Set<string>()
  }, [user])

  const [list, setList] = useState<CaseDocument[]>(() => documents.filter((d) => myCaseIds.has(d.caseId)))
  const [liveCases, setLiveCases] = useState<Case[]>([])
  const [canManage, setCanManage] = useState(!forStaff)
  const [caseFilter, setCaseFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [docName, setDocName] = useState('')
  const [docCase, setDocCase] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ data: CaseDocument[] }>('/documents')
      .then((res) => setList(res.data || []))
      .catch(() => {})
    api<{ data: Case[] }>('/cases')
      .then((res) => setLiveCases(res.data || []))
      .catch(() => {})
    if (forStaff) {
      api<{ data: Staff }>('/staff/me')
        .then((res) => setCanManage(Boolean(res.data.permissions?.manageDocuments)))
        .catch(() => setCanManage(false))
    }
  }, [forStaff])

  const filtered = list.filter((d) => !caseFilter || d.caseId === caseFilter)

  const columns: Column<CaseDocument>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'type', header: 'Type', render: (r) => r.type },
    {
      key: 'case',
      header: 'Case',
      render: (r) => cases.find((c) => c.id === r.caseId)?.caseNumber || '—',
    },
    { key: 'date', header: 'Upload Date', render: (r) => formatDate(r.uploadDate) },
    { key: 'by', header: 'Uploaded By', render: (r) => r.uploadedBy },
    { key: 'ft', header: 'File Type', render: (r) => <Badge variant="muted">{r.fileType}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted">
            {forStaff ? 'অ্যাসাইন করা মামলার ডকুমেন্ট' : 'কেস সম্পর্কিত ডকুমেন্ট ম্যানেজমেন্ট'}
          </p>
        </div>
        {canManage && <Button onClick={() => setOpen(true)}>Upload Document</Button>}
      </div>

      <div className="max-w-xs">
        <Select
          label="Filter by Case"
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          placeholder="সব মামলা"
          options={(liveCases.length ? liveCases : cases.filter((c) => myCaseIds.has(c.id))).map((c) => ({
            value: c.id,
            label: `${c.caseNumber} — ${c.caseTitle}`,
          }))}
        />
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="কোনো ডকুমেন্ট নেই।" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload Document"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const caseId = docCase || liveCases[0]?.id
                if (!caseId || !docName.trim()) {
                  setError('মামলা ও নাম দিন।')
                  return
                }
                try {
                  const res = await api<{ data: CaseDocument }>('/documents', {
                    method: 'POST',
                    body: { caseId, name: docName.trim(), type: 'Other', fileType: 'PDF' },
                  })
                  setList((prev) => [res.data, ...prev])
                  setDocName('')
                  setOpen(false)
                  setError('')
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : 'আপলোড হয়নি।')
                }
              }}
            >
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Document Name" placeholder="ফাইলের নাম" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <Select
            label="Case"
            value={docCase}
            onChange={(e) => setDocCase(e.target.value)}
            options={(liveCases.length ? liveCases : cases).map((c) => ({
              value: c.id,
              label: `${c.caseNumber} — ${c.caseTitle}`,
            }))}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Select
            label="Type"
            options={['Case File', 'Petition', 'Order', 'Judgment', 'Evidence', 'Other'].map((v) => ({
              value: v,
              label: v,
            }))}
          />
          <Input label="File" type="file" />
          <p className="text-xs text-muted">পাবলিক ইউজার প্রাইভেট ডকুমেন্ট দেখতে পারবে না।</p>
        </div>
      </Modal>
    </div>
  )
}
