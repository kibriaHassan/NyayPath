import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Scale, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useLandingLang, type LandingKey } from '@/lib/landingLang'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const links: { to: string; key: LandingKey; fallback: string }[] = [
  { to: '/', key: 'home', fallback: 'Home' },
  { to: '/lawyers', key: 'findLawyer', fallback: 'Find a Lawyer' },
  { to: '/cases/search', key: 'caseSearch', fallback: 'Case Search' },
  { to: '/about', key: 'about', fallback: 'About' },
  { to: '/contact', key: 'contact', fallback: 'Contact' },
]

function LangSwitch({ lang, setLang }: { lang: 'bn' | 'en'; setLang: (lang: 'bn' | 'en') => void }) {
  return (
    <div className="flex rounded-full bg-[#e7f0ee] p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={cn(
          'rounded-full px-3 py-1.5 transition',
          lang === 'bn' ? 'bg-white text-[#245e66] shadow-sm' : 'text-[#5d7572]',
        )}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={cn(
          'rounded-full px-3 py-1.5 transition',
          lang === 'en' ? 'bg-white text-[#245e66] shadow-sm' : 'text-[#5d7572]',
        )}
      >
        English
      </button>
    </div>
  )
}

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { lang, setLang, t } = useLandingLang()
  const onLanding = pathname === '/'
  const label = (key: LandingKey, fallback: string) => (onLanding ? t(key) : fallback)

  const dashboardPath =
    user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : user?.role === 'LAWYER'
        ? '/lawyer/dashboard'
        : user?.role === 'STAFF'
          ? '/staff/dashboard'
          : null

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
              {label(link.key, link.fallback)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {onLanding ? <LangSwitch lang={lang} setLang={setLang} /> : null}
          <div className="hidden items-center gap-2 lg:flex">
          {dashboardPath ? (
            <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)}>
              {label('dashboard', 'Dashboard')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                {label('login', 'Login')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/register/staff')}>
                {label('staffRegister', 'Staff Register')}
              </Button>
              <Button size="sm" variant="bronze" onClick={() => navigate('/register')}>
                {label('lawyerRegister', 'Register as Lawyer')}
              </Button>
            </>
          )}
          </div>
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
              <span className="font-display text-lg font-semibold">{label('menu', 'Menu')}</span>
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
                  {label(link.key, link.fallback)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-2 border-t border-border p-4">
              {onLanding ? <LangSwitch lang={lang} setLang={setLang} /> : null}
              {dashboardPath ? (
                <Button fullWidth onClick={() => { setOpen(false); navigate(dashboardPath) }}>
                  {label('dashboard', 'Dashboard')}
                </Button>
              ) : (
                <>
                  <Button fullWidth variant="outline" onClick={() => { setOpen(false); navigate('/login') }}>
                    {label('login', 'Login')}
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => { setOpen(false); navigate('/register/staff') }}>
                    {label('staffRegister', 'Staff Register')}
                  </Button>
                  <Button fullWidth variant="bronze" onClick={() => { setOpen(false); navigate('/register') }}>
                    {label('lawyerRegister', 'Register as Lawyer')}
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
