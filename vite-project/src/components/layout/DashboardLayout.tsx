import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flame,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
  UserCircle,
  ClipboardList,
  PlusCircle,
  Scale,
  Landmark,
  MessageSquare,
  Database,
  Shield,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { cases } from '@/data/mock'
import { isSameDateKey, nextWorkingDayKey, todayKey } from '@/lib/courtCalendar'

const COLLAPSE_KEY = 'nyaypath-sidebar-collapsed'

export type NavItem = {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
  /** When set, controls highlight instead of default prefix matching */
  isActivePath?: (pathname: string) => boolean
  /** Visual emphasis — amber urgent pill in sidebar */
  tone?: 'default' | 'urgent'
  /** Show live count badge (computed in SidebarNav) */
  showUrgentCount?: boolean
}

export const lawyerNav: NavItem[] = [
  { to: '/lawyer/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  {
    to: '/lawyer/urgent',
    label: 'আজ ও পরবর্তী দিন',
    icon: <Flame className="h-4 w-4" />,
    end: true,
    tone: 'urgent',
    showUrgentCount: true,
  },
  { to: '/lawyer/profile', label: 'My Profile', icon: <UserCircle className="h-4 w-4" /> },
  {
    to: '/lawyer/cases',
    label: 'My Cases',
    icon: <Briefcase className="h-4 w-4" />,
    isActivePath: (p) =>
      p.startsWith('/lawyer/cases') && !p.startsWith('/lawyer/cases/new'),
  },
  {
    to: '/lawyer/cases/new',
    label: 'Add New Case',
    icon: <PlusCircle className="h-4 w-4" />,
    end: true,
    isActivePath: (p) => p === '/lawyer/cases/new' || p.startsWith('/lawyer/cases/new/'),
  },
  { to: '/lawyer/hearings', label: 'Upcoming Hearings', icon: <Calendar className="h-4 w-4" /> },
  { to: '/lawyer/staff', label: 'Staff Management', icon: <Users className="h-4 w-4" /> },
  { to: '/lawyer/documents', label: 'Documents', icon: <FolderOpen className="h-4 w-4" /> },
  { to: '/lawyer/tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/lawyer/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { to: '/lawyer/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

export const staffNav: NavItem[] = [
  { to: '/staff/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  {
    to: '/staff/urgent',
    label: 'আজ ও পরবর্তী দিন',
    icon: <Flame className="h-4 w-4" />,
    end: true,
    tone: 'urgent',
    showUrgentCount: true,
  },
  { to: '/staff/cases', label: 'My Assigned Cases', icon: <Briefcase className="h-4 w-4" /> },
  { to: '/staff/hearings', label: 'Upcoming Hearings', icon: <Calendar className="h-4 w-4" /> },
  { to: '/staff/tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/staff/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { to: '/staff/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { to: '/staff/profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
  { to: '/staff/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

export const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/admin/lawyers', label: 'উকিল', icon: <Scale className="h-4 w-4" /> },
  { to: '/admin/staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { to: '/admin/cases', label: 'মামলা', icon: <Briefcase className="h-4 w-4" /> },
  { to: '/admin/courts', label: 'আদালত ক্যাটালগ', icon: <Landmark className="h-4 w-4" /> },
  { to: '/admin/contacts', label: 'কন্টাক্ট মেসেজ', icon: <MessageSquare className="h-4 w-4" /> },
  { to: '/admin/system', label: 'সিস্টেম / DB', icon: <Database className="h-4 w-4" /> },
  { to: '/admin/settings', label: 'Settings', icon: <Shield className="h-4 w-4" /> },
]

function useUrgentHearingCount(basePath: string) {
  const user = useAuthStore((s) => s.user)
  return useMemo(() => {
    if (!user || basePath === '/admin') return 0
    const today = todayKey()
    const next = nextWorkingDayKey()
    const mine =
      basePath === '/lawyer'
        ? cases.filter((c) => c.ownerLawyerId === user.id)
        : cases.filter((c) => c.assignedStaffIds.includes(user.id))
    return mine.filter(
      (c) =>
        c.nextHearingDate &&
        (isSameDateKey(c.nextHearingDate, today) || isSameDateKey(c.nextHearingDate, next)),
    ).length
  }, [basePath, user])
}

function SidebarNav({
  items,
  collapsed,
  onNavigate,
  urgentCount = 0,
}: {
  items: NavItem[]
  collapsed?: boolean
  onNavigate?: () => void
  urgentCount?: number
}) {
  const { pathname } = useLocation()

  return (
    <nav className={cn('flex flex-col gap-1', collapsed ? 'p-2' : 'px-3 py-2')}>
      {items.map((item) => {
        const isUrgent = item.tone === 'urgent'
        const count = item.showUrgentCount ? urgentCount : undefined

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => {
              const active = item.isActivePath ? item.isActivePath(pathname) : isActive
              return cn(
                'relative flex items-center rounded-xl text-sm font-medium transition',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                active && !isUrgent && 'bg-[#2563eb] text-white shadow-md shadow-blue-900/20',
                active && isUrgent && 'bg-warning text-white shadow-md shadow-amber-900/25',
                !active &&
                  isUrgent &&
                  'bg-warning/15 text-warning ring-1 ring-warning/30 hover:bg-warning/25 hover:text-warning',
                !active && !isUrgent && 'text-sand/75 hover:bg-white/10 hover:text-white',
              )
            }}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof count === 'number' && count > 0 && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                      pathname.startsWith(item.to)
                        ? 'bg-white/25 text-white'
                        : 'bg-warning text-white',
                    )}
                  >
                    {count}
                  </span>
                )}
              </>
            )}
            {collapsed && typeof count === 'number' && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-white ring-2 ring-[#0b1f2a]">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function DashboardLayout({
  nav,
  basePath,
  title,
}: {
  nav: NavItem[]
  basePath: string
  title: string
}) {
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const urgentCount = useUrgentHearingCount(basePath)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#f3f6f8]">
      {/* Desktop sidebar — fixed height, never scrolls with main content */}
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col bg-[#0b1f2a] text-sand transition-[width] duration-300 ease-out lg:flex',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-start border-b border-white/10',
            collapsed ? 'flex-col items-center gap-2 px-2 py-3' : 'justify-between gap-2 px-4 py-4',
          )}
        >
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold leading-tight">NyayPath</p>
              <p className="mt-0.5 truncate text-xs text-sand/60">{title}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-sand transition hover:bg-white/15"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'সাইডবার খুলুন' : 'সাইডবার গুটান'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav items={nav} collapsed={collapsed} urgentCount={urgentCount} />
        </div>

        <div className={cn('shrink-0 border-t border-white/10', collapsed ? 'p-2' : 'p-3')}>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={cn(
              'flex w-full items-center rounded-lg text-sm font-medium text-sand/80 transition hover:bg-danger/20 hover:text-white',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setDrawer(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col bg-[#0b1f2a] text-sand shadow-xl safe-bottom">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="font-display text-lg font-semibold">NyayPath</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SidebarNav items={nav} onNavigate={() => setDrawer(false)} urgentCount={urgentCount} />
            </div>
            <div className="shrink-0 border-t border-white/10 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sand/80 hover:bg-danger/20 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column — only this area scrolls */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-white/95 px-3 backdrop-blur safe-bottom sm:h-16 sm:gap-3 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="touch-target shrink-0 rounded-lg p-2 hover:bg-mist lg:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-mist lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'সাইডবার খুলুন' : 'সাইডবার গুটান'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.name}
                {user?.role === 'STAFF' && user.staffCode ? (
                  <span className="ml-1.5 font-mono text-xs font-semibold text-teal">{user.staffCode}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted">{user?.role}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationDropdown basePath={basePath} />
            {user?.photo ? (
              <img src={user.photo} alt="" className="h-8 w-8 rounded-full border border-border sm:h-9 sm:w-9" />
            ) : (
              <div className="hidden h-9 items-center gap-2 rounded-full border border-border bg-white pl-1 pr-3 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb] text-[10px] font-bold text-white">
                  {(user?.name || 'U')
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-semibold text-ink">{user?.name}</p>
                  <p className="text-[10px] text-muted">{user?.role}</p>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/')}>
              Public Site
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f3f6f8] p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
