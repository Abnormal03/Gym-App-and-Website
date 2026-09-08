// src/store/auth.store.ts
import { create } from 'zustand';
import { User } from '../types/user.types';
import { deleteItem, readItem, writeItem } from '../services/auth.storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (user, token) => {
    await writeItem('token', token);
    await writeItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: async () => {
    await deleteItem('token');
    await deleteItem('user');
    set({ user: null, token: null });
  },

  hydrate: async () => {
    try {
      const token = await readItem('token');
      const userStr = await readItem('user');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), token });
      }
    } catch (e) {
      // If anything goes wrong reading storage, just start fresh
    } finally {
      set({ isLoading: false });
    }
  },
}));