import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export type PieSlice = {
  name: string
  value: number
  color: string
}

export type PieChartBlock = {
  id: string
  title: string
  subtitle?: string
  data: PieSlice[]
}

const EMPTY: PieSlice[] = [{ name: 'কোনো ডেটা নেই', value: 1, color: '#d5e0e3' }]

function ChartCard({ block }: { block: PieChartBlock }) {
  const hasData = block.data.some((d) => d.value > 0)
  const data = hasData ? block.data.filter((d) => d.value > 0) : EMPTY

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-panel/60">
        <h3 className="font-display text-base font-semibold text-ink">{block.title}</h3>
        {block.subtitle && <p className="mt-0.5 text-xs text-muted">{block.subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mx-auto h-56 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={hasData ? 2 : 0}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [hasData ? value : '—', 'সংখ্যা']}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #d5e0e3',
                  fontSize: 12,
                }}
              />
              {hasData && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-ink">{value}</span>}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {hasData && (
          <ul className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-3">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-xs text-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto font-semibold text-ink">{d.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPieCharts({ charts }: { charts: PieChartBlock[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">পাই চার্ট ওভারভিউ</h2>
        <p className="text-sm text-muted">ড্যাশবোর্ডের মূল সংখ্যাগুলো চার্ট আকারে।</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((block) => (
          <ChartCard key={block.id} block={block} />
        ))}
      </div>
    </section>
  )
}
