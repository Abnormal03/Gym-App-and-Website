import { asList } from '../../api/client';

const num = (x) => Number(x ?? 0) || 0;

export function normalizeEarnings(data) {
  const perGym = asList(data, 'balances').map((g) => ({
    gymId: g.gymId,
    gymName: g.gymName || `Gym ${g.gymId}`,
    available: num(g.available),
    requested: num(g.requested),
    paid: num(g.paid),
  }));
  const sum = (k) => perGym.reduce((n, g) => n + g[k], 0);
  return {
    balance: { available: sum('available'), requested: sum('requested'), paid: sum('paid') },
    perGym,
    ledger: asList(data, 'ledger'),
  };
}