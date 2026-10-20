import { Link } from 'react-router-dom';
import { HeartPulse, MessageSquare, Wallet, Apple } from 'lucide-react';
import { meApi } from '../../api/me.api';
import { chatApi } from '../../api/chat.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import { ErrorState } from '../../components/common/states';
import Button from '../../components/common/Button';
import { formatMoney } from '../../utils/format';
import { normalizeEarnings } from '../provider/earningsShape';

export default function NutritionDashboard() {
  const { user } = useAuth();
  const clients = useAsync(() => meApi.clients(), []);
  const threads = useAsync(() => chatApi.threads(), []);
  const earnings = useAsync(() => meApi.earnings(), []);
  const plan = useAsync(() => meApi.consultationPlan(), []);

  const unread = asList(threads.data, 'threads').reduce((n, t) => n + (t.unreadCount || 0), 0);
  const bal = earnings.data ? normalizeEarnings(earnings.data).balance : null;
  const p = plan.data?.plan || plan.data;

  return (
    <>
      <PageHeader title={`Welcome, ${user.name?.split(' ')[0]}`} subtitle="Clients, messages and balances across every gym." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active clients" value={asList(clients.data, 'clients').length} icon={HeartPulse} loading={clients.loading && !clients.data} />
        <StatCard label="Unread messages" value={unread} icon={MessageSquare} loading={threads.loading && !threads.data} />
        <StatCard label="Available balance" value={bal ? formatMoney(bal.available) : '-'} hint="Across all gyms" icon={Wallet} loading={earnings.loading && !earnings.data} />
      </div>
      <Card title="Your consultation plan" className="mt-6" actions={<Link to="/nutrition/plan" className="text-sm font-medium text-brand hover:underline">Edit</Link>}>
        {plan.loading && !plan.data ? <p className="text-ink-500">Loading...</p> : p && p.price != null ? <p><strong>{formatMoney(p.price)}</strong> for {p.chatDurationDays ?? p.chatDays ?? '-'} days of chat.</p> : (
          <div className="flex items-center justify-between gap-3">Plan<p className="text-ink-500"></p><Button as={Link} to="/nutrition/plan" size="sm" icon={Apple}>Set up plan</Button></div>
        )}
      </Card>
    </>
  );
}
