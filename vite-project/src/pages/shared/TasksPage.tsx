import { useMemo, useState, type FormEvent } from 'react'
import { tasks, staffMembers, cases } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { formatDate } from '@/lib/utils'
import type { Task } from '@/types'
import { getStaffById } from '@/data/mock'

export default function TasksPage({ forStaff = false }: { forStaff?: boolean }) {
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState(() => {
    if (user?.role === 'LAWYER') return tasks.filter((t) => t.lawyerId === user.id)
    if (user?.role === 'STAFF') return tasks.filter((t) => t.assignedStaffId === user.id)
    return []
  })
  const [open, setOpen] = useState(false)

  const myStaff = useMemo(
    () => staffMembers.filter((s) => s.lawyerId === user?.id && s.active),
    [user],
  )
  const myCases = useMemo(
    () => cases.filter((c) => c.ownerLawyerId === user?.id),
    [user],
  )

  const columns: Column<Task>[] = [
    { key: 'title', header: 'Task', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'case', header: 'Case', render: (r) => r.caseNumber },
    {
      key: 'staff',
      header: 'Assigned Staff',
      render: (r) => getStaffById(r.assignedStaffId)?.name || '—',
    },
    { key: 'due', header: 'Due Date', render: (r) => formatDate(r.dueDate) },
    {
      key: 'priority',
      header: 'Priority',
      render: (r) => <Badge variant={statusBadgeVariant(r.priority)}>{r.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Select
          value={r.status}
          onChange={(e) =>
            setList((prev) =>
              prev.map((t) =>
                t.id === r.id ? { ...t, status: e.target.value as Task['status'] } : t,
              ),
            )
          }
          options={['Pending', 'In Progress', 'Completed'].map((v) => ({ value: v, label: v }))}
          className="h-9"
        />
      ),
    },
  ]

  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const caseId = String(fd.get('caseId') || '')
    const caseItem = cases.find((c) => c.id === caseId)
    setList((prev) => [
      {
        id: `task-${Date.now()}`,
        title: String(fd.get('title') || ''),
        description: String(fd.get('description') || ''),
        caseId,
        caseNumber: caseItem?.caseNumber || '',
        assignedStaffId: String(fd.get('staffId') || ''),
        lawyerId: user!.id,
        dueDate: String(fd.get('dueDate') || ''),
        priority: String(fd.get('priority') || 'Medium') as Task['priority'],
        status: 'Pending',
      },
      ...prev,
    ])
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted">
            {forStaff ? 'আপনার অ্যাসাইন করা টাস্ক' : 'স্টাফকে টাস্ক অ্যাসাইন ও ট্র্যাক করুন'}
          </p>
        </div>
        {!forStaff && <Button onClick={() => setOpen(true)}>Assign Task</Button>}
      </div>

      <DataTable columns={columns} data={list} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign Task"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="task-form">
              Save
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={onAdd} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input name="title" label="Task Title" required />
          </div>
          <div className="sm:col-span-2">
            <Textarea name="description" label="Description" />
          </div>
          <Select
            name="caseId"
            label="Case"
            required
            options={myCases.map((c) => ({ value: c.id, label: `${c.caseNumber} — ${c.caseTitle}` }))}
          />
          <Select
            name="staffId"
            label="Assigned Staff"
            required
            options={myStaff.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input name="dueDate" label="Due Date" type="date" required />
          <Select
            name="priority"
            label="Priority"
            options={['Low', 'Medium', 'High', 'Urgent'].map((v) => ({ value: v, label: v }))}
          />
        </form>
      </Modal>
    </div>
  )
}
