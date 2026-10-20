import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { usersApi } from '../../api/users.api';
import { useSubmit } from '../../hooks/useSubmit';
import { collect, passwordProblem, required } from '../../utils/validators';
import { TextField } from '../common/Field';
import Button from '../common/Button';

/**
 * mode="portal": provider + staff accounts -> POST /api/auth/change-password (8-72 chars, letter + digit)
 * mode="member": members -> PUT /api/users/change-password (min 8, must differ from the current one)
 */
export default function ChangePasswordForm({ mode = 'portal', onDone }) {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const { run, pending, error } = useSubmit();
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      currentPassword: () => required(values.currentPassword, 'Current password'),
      newPassword: () => {
        if (mode === 'member') {
          if (values.newPassword.length < 8) return 'Use at least 8 characters.';
          return values.newPassword === values.currentPassword ? 'The new password must differ from the current one.' : null;
        }
        return passwordProblem(values.newPassword);
      },
      confirm: () => (values.confirm === values.newPassword ? null : 'The passwords do not match.'),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { currentPassword: values.currentPassword, newPassword: values.newPassword };
    const ok = await run(() => (mode === 'member' ? usersApi.changePassword(body) : authApi.changePassword(body)), { success: 'Password changed' });
    if (ok) {
      setValues({ currentPassword: '', newPassword: '', confirm: '' });
      onDone?.();
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Current password" type="password" autoComplete="current-password" value={values.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} required />
      <TextField label="New password" type="password" autoComplete="new-password" value={values.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint={mode === 'portal' ? '8-72 characters with at least one letter and one digit.' : 'At least 8 characters.'} required />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} required />
      {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      <Button type="submit" loading={pending}>Change password</Button>
    </form>
  );
}
