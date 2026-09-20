import { useState, useEffect } from 'react';
import { userService } from '../services/user.service';
import { useAuthStore } from '../store/auth.store';
import { UpdateProfileDTO, ChangePasswordDTO } from '../types/user.types';

export const useProfile = () => {
  const { user, login, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateProfile = async (data: UpdateProfileDTO) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await userService.updateProfile(data);
      // Update store so header/drawer reflects new name immediately
      if (token) await login(res.user, token);
      setSuccess('Profile updated successfully');
    } catch (err:any) {
      setError(err.message || "profile update failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (data: ChangePasswordDTO) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await userService.changePassword(data);
      setSuccess('Password changed successfully');
    } catch (err) {
      setError(err as string);
    } finally {
      setSaving(false);
    }
  };

  return { user, loading, saving, error, success, updateProfile, changePassword };
};