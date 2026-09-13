import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Calendar,
  FileText,
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
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export type NavItem = {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

export const lawyerNav: NavItem[] = [
  { to: '/lawyer/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/lawyer/profile', label: 'My Profile', icon: <UserCircle className="h-4 w-4" /> },
  { to: '/lawyer/cases', label: 'My Cases', icon: <Briefcase className="h-4 w-4" /> },
  { to: '/lawyer/cases/new', label: 'Add New Case', icon: <PlusCircle className="h-4 w-4" /> },
  { to: '/lawyer/hearings', label: 'Upcoming Hearings', icon: <Calendar className="h-4 w-4" /> },
  { to: '/lawyer/staff', label: 'Staff Management', icon: <Users className="h-4 w-4" /> },
  { to: '/lawyer/documents', label: 'Documents', icon: <FolderOpen className="h-4 w-4" /> },
  { to: '/lawyer/tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/lawyer/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { to: '/lawyer/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

export const staffNav: NavItem[] = [
  { to: '/staff/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/staff/cases', label: 'My Assigned Cases', icon: <Briefcase className="h-4 w-4" /> },
  { to: '/staff/hearings', label: 'Upcoming Hearings', icon: <Calendar className="h-4 w-4" /> },
  { to: '/staff/tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/staff/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { to: '/staff/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { to: '/staff/profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
  { to: '/staff/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-ink text-white'
                : 'text-sand/80 hover:bg-white/10 hover:text-white',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
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
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-mist/40 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-ink text-sand lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="font-display text-xl font-semibold">NyayPath</p>
          <p className="mt-1 text-xs text-sand/60">{title}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={nav} />
        </div>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sand/80 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setDrawer(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col bg-ink text-sand shadow-xl safe-bottom">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="font-display text-lg font-semibold">NyayPath</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={nav} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-white/95 px-3 backdrop-blur safe-bottom sm:h-16 sm:gap-3 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="touch-target shrink-0 rounded-lg p-2 hover:bg-mist lg:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-xs text-muted">{user?.role}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationDropdown basePath={basePath} />
            {user?.photo && (
              <img src={user.photo} alt="" className="h-8 w-8 rounded-full border border-border sm:h-9 sm:w-9" />
            )}
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/')}>
              Public Site
            </Button>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
