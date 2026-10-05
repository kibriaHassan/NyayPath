import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export type PipelineStage = {
  label: string
  value: number
  color: string
}

export type BarPoint = {
  name: string
  value: number
}

export function CasePipelineCard({ stages }: { stages: PipelineStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1)

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="border-b-0 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">মামলা পাইপলাইন</h3>
            <p className="text-xs text-muted">স্ট্যাটাস অনুযায়ী বিতরণ</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-2 flex items-end justify-between gap-3 sm:gap-4">
          {stages.map((stage) => {
            const h = Math.max(12, Math.round((stage.value / max) * 140))
            return (
              <div key={stage.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-sm font-semibold text-ink">{stage.value}</span>
                <div
                  className="w-full max-w-[52px] rounded-t-lg rounded-b-md transition-all"
                  style={{ height: h, background: stage.color }}
                  title={`${stage.label}: ${stage.value}`}
                />
                <p className="w-full truncate text-center text-[10px] font-medium leading-tight text-muted sm:text-xs">
                  {stage.label}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function HearingBarsCard({ data }: { data: BarPoint[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="border-b-0 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">শুনানি ওভারভিউ</h3>
            <p className="text-xs text-muted">সাপ্তাহিক কর্মদিবস অনুযায়ী</p>
          </div>
          <span className="rounded-lg bg-mist px-2.5 py-1 text-xs font-semibold text-ink">এই সপ্তাহ</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eef0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5a6f74' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5a6f74' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(26,107,117,0.06)' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #d5e0e3', fontSize: 12 }}
              />
              <Bar dataKey="value" name="শুনানি" fill="#2563eb" radius={[8, 8, 4, 4]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardListCard({
  title,
  subtitle,
  actionLabel,
  actionTo,
  children,
}: {
  title: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
  children: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b-0 pb-0">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {actionTo && actionLabel && (
          <Link to={actionTo} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-3">{children}</CardContent>
    </Card>
  )
}

export function DateChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb]">
        <CalendarDays className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">আজ</p>
        <p className="text-sm font-semibold text-ink">{label}</p>
      </div>
    </div>
  )
}

export function ProgressRow({
  label,
  meta,
  percent,
  tone = 'teal',
}: {
  label: string
  meta?: string
  percent: number
  tone?: 'teal' | 'bronze' | 'warning' | 'info' | 'danger'
}) {
  const bar = {
    teal: 'bg-teal',
    bronze: 'bg-bronze',
    warning: 'bg-warning',
    info: 'bg-info',
    danger: 'bg-danger',
  }[tone]

  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink">{label}</p>
        <span className="shrink-0 text-xs font-semibold text-muted">{meta ?? `${percent}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mist">
        <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  )
}
