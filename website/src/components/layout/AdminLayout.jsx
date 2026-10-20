import { Building2 } from 'lucide-react';
import AppShell from './AppShell';
import { AdminGymProvider, useAdminGym } from '../../contexts/AdminGymContext';
import { ADMIN_NAV } from '../../config/navigation';

function GymSwitcher() {
  const { gyms, gym, selectGym, loading } = useAdminGym();
  if (loading) return <span className="text-sm text-ink-400">Loading gyms...</span>;
  if (!gyms.length) return <span className="text-sm text-ink-500">No gym yet</span>;
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-ink-500" aria-hidden="true" />
      <label htmlFor="gym-switch" className="sr-only">Active gym</label>
      <select id="gym-switch" value={gym?.id ?? ''} onChange={(e) => selectGym(e.target.value)} className="max-w-[12rem] rounded-md border border-ink-200 bg-white py-1 pl-2 pr-7 text-sm sm:max-w-xs">
        {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminGymProvider>
      <AppShell nav={ADMIN_NAV} portal="Gym administration" headerExtra={<GymSwitcher />} />
    </AdminGymProvider>
  );
}
