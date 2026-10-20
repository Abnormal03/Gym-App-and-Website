import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import Button from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function PublicLayout() {
  const { isAuthenticated, home } = useAuth();
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }) => `rounded-md px-3 py-2 text-[15px] ${isActive ? 'text-brand' : 'text-ink-600 hover:text-ink'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Gym Platform home"><Logo /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={linkCls}>Home</NavLink>
           <NavLink to="/login" className={linkCls}>Sign in</NavLink>
          </nav>
          <button type="button" className="rounded p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-ink-100 px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            <NavLink to="/" end className={linkCls}>Home</NavLink>
               <NavLink to="/login" className={linkCls}>Sign in</NavLink>
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo className="scale-90" />
          <p>Prices in ETB. Times shown in Addis Ababa.</p>
        </div>
      </footer>
    </div>
  );
}
