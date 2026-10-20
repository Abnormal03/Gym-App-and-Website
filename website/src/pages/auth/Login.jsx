import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubmit } from '../../hooks/useSubmit';
import { collect, isEmail, required } from '../../utils/validators';
import { TextField } from '../../components/common/Field';
import Button from '../../components/common/Button';
import Logo from '../../components/layout/Logo';
import { ROLE_HOME } from '../../config/roles';

const KINDS = [
  { value: 'admin', label: 'Gym admin' },
  { value: 'provider', label: 'Coach' },
  { value: 'staff', label: 'Gym staff' },
];
const KIND_HINT = {
  member: 'Book gyms, coaches and nutrition plans.',
  admin: 'Manage your gyms, packages, bookings and team.',
  provider: 'Trainers, physiotherapists and nutrition consultants.',
  staff: 'Front-desk accounts created by a gym admin.',
};
const STATS = [
  ['01', 'Gym admin'],
  ['02', 'Providers'],
  ['03', 'Consultants'],
];

export default function Login() {
  const { login, isAuthenticated, home, mustChangePassword, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { run, pending, error } = useSubmit();
  const [kind, setKind] = useState('admin');
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);

  if (isAuthenticated && !pending) return <Navigate to={mustChangePassword ? '/change-password' : home} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      email: () => (isEmail(values.email) ? null : 'Enter a valid email address.'),
      password: () => required(values.password, 'Password'),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const session = await run(() => login(kind, { email: values.email.trim(), password: values.password.trim() }), { silent: true });
    if (!session) return;
    if (session.mustChangePassword) return navigate('/change-password', { replace: true });
    const target = ROLE_HOME[session.role];
    const from = location.state?.from;
    navigate(from && from.startsWith(target) ? from : target, { replace: true });
    return undefined;
  };

  return (
<div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30%)]">      
  <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#e9e4e4] p-12 text-black lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-signal/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />

        <Link to="/" aria-label="Back to home" className="relative w-fit"><Logo light /></Link>

        <div className="relative">
          <p className="flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-black">
            <span aria-hidden="true" className="h-0.5 w-8 bg-signal" />
            YOUR FITNESS BUSINESS, CONNECTED
          </p>
          <h1 className="mt-5 text-6xl leading-[1.02] xl:text-7xl">
            Make every session count.
          </h1>
          <p className="mt-5 max-w-md text-lg text-black">
            One workspace for gym administration, physiotherapists, and nutrition consultants.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/15 pt-6">
            {STATS.map(([n, label]) => (
              <div key={n}>
                <dt className="font-display text-3xl font-semibold">{n}</dt>
                <dd className="text-sm text-black">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative flex justify-between text-xs tracking-[0.18em] text-black">
          <span>BUILT FOR MOVEMENT.</span>
          <span>ADDIS ABABA · ETHIOPIA</span>
        </p>
      </aside>


      
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 lg:min-h-0">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex justify-center lg:hidden" aria-label="Back to home"><Logo /></Link>
          <div className="card p-6 sm:p-8">
            <h1 className="text-3xl">Sign in</h1>

            <form onSubmit={submit} noValidate className="mt-5 space-y-4">
              <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} error={errors.email} required />
              <div className="relative">
                <TextField label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} error={errors.password} inputClassName="pr-10" required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-[30px] rounded p-1 text-ink-400 hover:text-ink">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}
              <div role="radiogroup" aria-label="Account type" className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1 sm:grid-cols-4">
                {KINDS.map((k) => (
                  <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)} className={`rounded-md px-2 py-1.5 text-sm font-medium ${kind === k.value ? 'bg-white shadow-sm' : 'text-ink-500 hover:text-ink'}`}>
                    {k.label}
                  </button>
                ))}
              </div>
              <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
            </form>
          </div>
        </div>
    </div>
    </div>

  );
}
