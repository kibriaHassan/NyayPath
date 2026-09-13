import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, Scale, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home' },
  { to: '/lawyers', label: 'Find a Lawyer' },
  { to: '/cases/search', label: 'Case Search' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const dashboardPath =
    user?.role === 'LAWYER' ? '/lawyer/dashboard' : user?.role === 'STAFF' ? '/staff/dashboard' : null

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-sand">
            <Scale className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            NyayPath
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-mist text-ink' : 'text-muted hover:bg-mist hover:text-ink',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {dashboardPath ? (
            <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/register/staff')}>
                Staff Register
              </Button>
              <Button size="sm" variant="bronze" onClick={() => navigate('/register')}>
                Register as Lawyer
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-mist"
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-2 border-t border-border p-4">
              {dashboardPath ? (
                <Button fullWidth onClick={() => { setOpen(false); navigate(dashboardPath) }}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button fullWidth variant="outline" onClick={() => { setOpen(false); navigate('/login') }}>
                    Login
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => { setOpen(false); navigate('/register/staff') }}>
                    Staff Register
                  </Button>
                  <Button fullWidth variant="bronze" onClick={() => { setOpen(false); navigate('/register') }}>
                    Register as Lawyer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
