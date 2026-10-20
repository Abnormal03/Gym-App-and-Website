import {
  Apple, Bot, Building2, CalendarCheck, CalendarClock, ClipboardList, Dumbbell, Flame, HeartPulse, KeyRound, LayoutDashboard,
  MessageSquare, Package, ScanLine,Star, Trophy, UserCog, UserRound, Users, Wallet,
} from 'lucide-react';

export const MEMBER_NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/gyms', label: 'Find a gym', icon: Dumbbell },
  { to: '/app/bookings', label: 'My bookings', icon: CalendarCheck },
  { to: '/app/sessions', label: 'Coaching sessions', icon: CalendarClock },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/progress', label: 'Streaks and badges', icon: Flame },
  { to: '/app/assistant', label: 'Help assistant', icon: Bot },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/gyms', label: 'Gyms', icon: Building2 },
  { to: '/admin/packages', label: 'Gym packages', icon: Package },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/providers', label: 'Trainers and physios', icon: UserCog },
  { to: '/admin/staff', label: 'Staff', icon: ClipboardList },
  { to: '/admin/payouts', label: 'Payout requests', icon: Wallet },
  { to: '/admin/leaderboard', label: 'Provider ranking', icon: Trophy },
  { to: '/admin/profile', label: 'Profile', icon: UserRound },
];

/** Trainer and physiotherapist share the same pages under their own URL prefix. */
export const coachNav = (base, { sessionsLabel = 'Sessions' } = {}) => [
  { to: base, label: 'Overview', icon: LayoutDashboard, end: true },
  { to: `${base}/sessions`, label: sessionsLabel, icon: CalendarClock },
  { to: `${base}/availability`, label: 'Availability', icon: CalendarCheck },
  { to: `${base}/packages`, label: 'My packages', icon: Package },
  { to: `${base}/clients`, label: 'Clients', icon: Users },
  { to: `${base}/messages`, label: 'Messages', icon: MessageSquare },
  { to: `${base}/earnings`, label: 'Earnings and payouts', icon: Wallet },
  { to: `${base}/reviews`, label: 'Reviews and ranking', icon: Star },
  { to: `${base}/profile`, label: 'Profile', icon: UserRound },
  { to: `${base}/account`, label: 'Password', icon: KeyRound },
];

export const NUTRITION_NAV = [
  { to: '/nutrition', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/nutrition/plan', label: 'Consultation plan', icon: Apple },
  { to: '/nutrition/clients', label: 'Clients', icon: HeartPulse },
  { to: '/nutrition/messages', label: 'Messages', icon: MessageSquare },
  { to: '/nutrition/earnings', label: 'Earnings and payouts', icon: Wallet },
  { to: '/nutrition/profile', label: 'Profile', icon: UserRound },
  { to: '/nutrition/account', label: 'Password', icon: KeyRound },
];

   export const STAFF_NAV = [
     { to: '/staff', label: 'Overview', icon: LayoutDashboard, end: true },
     { to: '/staff/checkin', label: 'Check-in', icon: ScanLine },
     { to: '/staff/account', label: 'Password', icon: KeyRound },
   ];
