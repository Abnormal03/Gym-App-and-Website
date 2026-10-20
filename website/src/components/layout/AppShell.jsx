import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABEL } from '../../config/roles';
import { Avatar } from '../common/Layout';

const PROFILE_PATH = {
  MEMBER: '/app/profile',
  GYM_ADMIN: '/admin/profile',
  TRAINER: '/trainer/profile',
  PHYSIOTHERAPIST: '/physio/profile',
  NUTRITION_CONSULTANT: '/nutrition/profile',
  GYM_STAFF: '/staff/account',
};
function NavList({ items, onNavigate }) {
  return (
    <nav aria-label="Main" className="space-y-0.5 px-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
`flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors ${isActive ? 'bg-black/10 text-black/100 shadow-[inset_3px_0_0_#000]' : 'text-black hover:bg-white/10'}`          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Dark sidebar on desktop, slide-over drawer on tablet/phone. */
export default function AppShell({ nav, headerExtra, portal }) {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sidebar = (onNavigate) => (
    <div className="flex h-full flex-col bg-[#2E68F4] py-5">
      <div className="px-6 pb-6"><Logo light /></div>
      <p className="px-6 pb-2 text-sm text-black">{portal || ROLE_LABEL[role]}</p>
      <div className="flex-1 overflow-y-auto pb-4"><NavList items={nav} onNavigate={onNavigate} /></div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar()}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-sheet-in">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded p-1 text-ink-300 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            {sidebar(() => setOpen(false))}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 text-ink-600 hover:bg-ink-50 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">{headerExtra}</div>
        <div className="flex items-center gap-3">
<Link
  to={PROFILE_PATH[role] || '/'}
  aria-label="Open my profile"
  className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-ink-50"
>
  <div className="hidden text-right sm:block">
    <p className="text-sm font-medium leading-tight">{user?.name}</p>
    <p className="text-xs text-ink-500">{ROLE_LABEL[role]}</p>
  </div>
  <Avatar name={user?.name} src={user?.photoUrl} size="sm" />
</Link>
          <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-600 hover:bg-ink-50">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
