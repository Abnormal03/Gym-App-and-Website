import { useState, useEffect, useRef } from 'react';
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

  const [updateChange, setUpdateChange] = useState(0);

  const [passError, setPassError] = useState<string | null>(null);
  const activeProfileRequest = useRef(0);

  useEffect(() => {
    if (!error && !passError && !success) return;

    const errorTimeout = setTimeout(() => {
      setError(null);
      setPassError(null);
      setSuccess(null);
    }, 5000);

    return () => clearTimeout(errorTimeout);
  }, [error, passError, success]);

  const updateProfile = async (data: UpdateProfileDTO) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await userService.updateProfile(data);
      if (token) await login(res.user, token);
      setUpdateChange((version) => version + 1);
      setSuccess("Profile updated successfully");
      return true;
    } catch (err: any) {
      setError(err.message || "profile update failed");
      return false;
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
    const requestId = ++activeProfileRequest.current;
    setLoading(true);
    setError(null);
    try {
      const loadedUser = await userService.getProfile();
      if (loadedUser.success) {
        return loadedUser.user;
      }
      if (requestId === activeProfileRequest.current) {
        setError("Unable to load profile.")
      }
      return user;
    } catch (error: any) {
      if (requestId === activeProfileRequest.current) {
        setError(error.message||"unable to load profile.")
      }
      return user;
    }finally{
      if (requestId === activeProfileRequest.current) {
        setLoading(false);
      }
    }
  }

  return { updateChange, setUpdateChange, user, loading, saving,savingPass, passError, error, success, updateProfile, changePassword, loadProfile };
};