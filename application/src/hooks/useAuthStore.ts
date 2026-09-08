// src/hooks/useAuth.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { LoginDTO, RegisterDTO } from '../types/user.types';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, logout, user, token } = useAuthStore();
  const router = useRouter();

  const getErrorMessage = (err: unknown) =>
    typeof err === 'string' ? err : 'Something went wrong';

  const handleRegister = async (data: RegisterDTO) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      await login(response.user, response.token);
      router.replace('/(tabs)');    // go to home on success
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data: LoginDTO) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      await login(response.user, response.token);
      router.replace('/(tabs)');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return {
    user,
    token,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};