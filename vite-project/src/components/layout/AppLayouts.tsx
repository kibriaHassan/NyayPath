import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'
import { DashboardLayout, lawyerNav, staffNav } from './DashboardLayout'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!roles.includes(user.role)) {
    if (user.role === 'LAWYER') return <Navigate to="/lawyer/dashboard" replace />
    if (user.role === 'STAFF') return <Navigate to="/staff/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function LawyerLayout() {
  return <DashboardLayout nav={lawyerNav} basePath="/lawyer" title="Lawyer Portal" />
}

export function StaffLayout() {
  return <DashboardLayout nav={staffNav} basePath="/staff" title="Staff Portal" />
}
