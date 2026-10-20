import { Link } from 'react-router-dom';
import { Apple, Building2, CalendarCheck, Dumbbell, HeartPulse, UserCog } from 'lucide-react';
import Button from '../../components/common/Button';
import { PERIODS, WEEKDAYS_SHORT, WEEK_ORDER } from '../../utils/format';

// Decorative pattern: which cells are "lit" in the hero timetable.
const LIT = new Set(['1-MORNING', '1-EVENING', '2-AFTERNOON', '3-MORNING', '3-EVENING', '4-EVENING', '5-MORNING', '6-AFTERNOON', '0-AFTERNOON']);

function TimetablePlate() {
  return (
    <div className="rounded-xl bg-ink-800 p-5 shadow-xl sm:p-6" aria-hidden="true">
      <div className="grid grid-cols-[3rem_repeat(3,1fr)] gap-1.5 text-center">
        <span />
        {PERIODS.map((p) => (
          <span key={p.value} className="pb-1 font-display text-sm text-ink-300">{p.label}<br /><span className="text-xs text-ink-400">{p.hours}</span></span>
        ))}
        {WEEK_ORDER.map((d) => (
          <div key={d} className="contents">
            <span className="self-center text-right text-sm text-ink-300">{WEEKDAYS_SHORT[d]}</span>
            {PERIODS.map((p) => (
              <span key={p.value} className={`h-9 rounded ${LIT.has(`${d}-${p.value}`) ? 'bg-[#1E3A8A]' : 'bg-ink-700'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const AUDIENCES = [
  { icon: Building2, title: 'Gym admins', text: 'Run packages, bookings, attendance, staff and payout requests for your gym.', to: '/login', cta: 'Admin sign in' },
  { icon: UserCog, title: 'Trainers and physiotherapists', text: 'Publish your weekly availability and packages, run sessions, and request payouts.', to: '/login', cta: 'Coach sign in' },
  { icon: Apple, title: 'Nutrition consultants', text: 'Offer a consultation plan, chat with clients across gyms, and track earnings per gym.', to: '/login', cta: 'Consultant sign in' },
];
const STEPS = [
  ['Choose your time', 'Single visit or a group booking, up to four hours, inside opening hours.'],
  ['Add a coach or nutrition plan', 'Optional. Coaches are matched to the hours they work.'],
  ['Pay with Chapa', 'One order, one payment. Unpaid orders are released after 30 minutes.'],
];

export default function Landing() {
  return (
    <div className="bg-[#1E3A8A]">
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-5xl leading-[1.05] sm:text-6xl">Book the floor, the coach and the meal plan in one checkout.</h1>
            <p className="mt-5 max-w-lg text-lg text-ink-600">Reserve gym time in Addis Ababa, add a trainer or physiotherapist for the same window, and unlock chat with a nutrition consultant, all paid in ETB.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button as={Link} to="/login" size="lg" variant="secondary">Sign in</Button>
            </div>
          </div>
          <TimetablePlate />
        </div>
      </section>
<div className="bg-[#1E3A8A]">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 ">
        <h2 className="text-3xl sm:text-4xl">One platform, three ways in</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ icon: Icon, title, text, to, cta }) => (
            <article key={title} className="card flex flex-col p-5">
              <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-xl">{title}</h3>
              <p className="mt-1 flex-1 text-ink-600">{text}</p>
              <Link to={to} className="mt-4 text-sm font-medium text-brand hover:underline">{cta}</Link>
            </article>
          ))}
        </div>
      </section>

      </div>
    </div>
  );
}
