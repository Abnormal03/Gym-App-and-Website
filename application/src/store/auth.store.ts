// src/store/auth.store.ts
import { create } from 'zustand';
import { Preference, User } from '../types/user.types';
import { deleteItem, readItem, writeItem } from '../services/auth.storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updatePref:(user: User, token: string|null)=> Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let sessionVersion = 0;
  let storageQueue: Promise<void> = Promise.resolve();

  const enqueueStorageOperation = (operation: () => Promise<void>) => {
    const queuedOperation = storageQueue.then(operation, operation);
    storageQueue = queuedOperation.catch(() => undefined);
    return queuedOperation;
  };

  return ({
  user: null,
  token: null,
  isLoading: true,

  login: async (user, token) => {
    await writeItem('token', token);
    await writeItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: async () => {
    sessionVersion += 1;
    await enqueueStorageOperation(async () => {
      await deleteItem('token');
      await deleteItem('user');
      set({ user: null, token: null });
    });
  },

  updatePref: async (user, token)=>{
    const requestVersion = sessionVersion;

    await enqueueStorageOperation(async () => {
      if (
        requestVersion !== sessionVersion ||
        !get().user ||
        get().token !== token
      ) {
        return;
      }

      await writeItem('user', JSON.stringify(user));

      if (
        requestVersion !== sessionVersion ||
        !get().user ||
        get().token !== token
      ) {
        return;
      }

      set({ user, token });
    });
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
  });
});