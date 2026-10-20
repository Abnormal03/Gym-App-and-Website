import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubmit } from '../../hooks/useSubmit';
import { collect, isEmail, isPhone, required } from '../../utils/validators';
import { TextField } from '../../components/common/Field';
import Button from '../../components/common/Button';
import Logo from '../../components/layout/Logo';

export default function Register() {
  const { register, isAuthenticated, home } = useAuth();
  const navigate = useNavigate();
  const { run, pending, error, fieldErrors } = useSubmit();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});

  if (isAuthenticated && !pending) return <Navigate to={home} replace />;
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      name: () => required(values.name, 'Name'),
      email: () => (isEmail(values.email) ? null : 'Enter a valid email address.'),
      phone: () => (values.phone && !isPhone(values.phone) ? 'Enter a valid phone number, e.g. +251911000000.' : null),
      password: () => (values.password.length >= 8 ? null : 'Use at least 8 characters.'),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { name: values.name.trim(), email: values.email.trim(), password: values.password };
    if (values.phone.trim()) body.phone = values.phone.trim();
    const session = await run(() => register(body), { success: 'Welcome aboard', silent: true });
    if (session) navigate('/app', { replace: true });
  };
  const err = (k) => errors[k] || fieldErrors[k];

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center" aria-label="Back to home"><Logo /></Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl">Create your account</h1>
          <p className="mt-1 text-ink-500">Member accounts are free. Coaches and staff are added by a gym admin.</p>
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <TextField label="Full name" autoComplete="name" value={values.name} onChange={set('name')} error={err('name')} required />
            <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={err('email')} required />
            <TextField label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} error={err('phone')} hint="Optional." />
            <TextField label="Password" type="password" autoComplete="new-password" value={values.password} onChange={set('password')} error={err('password')} hint="At least 8 characters." required />
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}
            <Button type="submit" size="lg" className="w-full" loading={pending}>Create account</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-500">Already registered? <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
