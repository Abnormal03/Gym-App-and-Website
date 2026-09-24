import { useState, useEffect } from 'react';
import { userService } from '../services/user.service';
import { useAuthStore } from '../store/auth.store';
import { UpdateProfileDTO, ChangePasswordDTO } from '../types/user.types';

export const useProfile = () => {
  const { user, login, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [passError, setPassError] = useState<string | null>(null);

  const clearError = ()=>{
    setError(null);
    setPassError(null);
  }
  useEffect(()=>{
    if(!error&&!passError) return;
    const errorTimeout = setTimeout(()=>{
      clearError();
    }, 5000);
    return ()=> clearTimeout(errorTimeout);
  },[error, passError, clearError])

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
    setSavingPass(true);
    setPassError(null);
    setSuccess(null);
    try {
      await userService.changePassword(data);
      setSuccess('Password changed successfully');
    } catch (err:any) {
      setPassError(err?.message|| "unable to change password!");
    } finally {
      setSavingPass(false);
    }
  };

  const loadProfile = async ()=>{
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const loadedUser = await userService.getProfile();
      if (loadedUser.success) {
        return loadedUser.user;
      }
      setError("Unable to load profile.")
      return user;
    } catch (error: any) {
      setError(error.message||"unable to load profile.")
      return user;
    }finally{
      setLoading(false);
    }
  }

  return { user, loading, saving,savingPass, passError, error, success, updateProfile, changePassword, loadProfile };
};