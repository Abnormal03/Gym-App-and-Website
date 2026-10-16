// src/store/auth.store.ts
import { create } from 'zustand';
import { Preference, User } from '../types/user.types';
import { deleteItem, readItem, writeItem } from '../services/auth.storage';
import { isTokenExpired } from '../utils/authToken';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutIfTokenMatches: (token: string) => Promise<boolean>;
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
    const requestVersion = ++sessionVersion;
    await enqueueStorageOperation(async () => {
      if (requestVersion !== sessionVersion) return;
      await writeItem('token', token);
      if (requestVersion !== sessionVersion) return;
      await writeItem('user', JSON.stringify(user));
      if (requestVersion === sessionVersion) {
        set({ user, token });
      }
    });
  },

  logout: async () => {
    const requestVersion = ++sessionVersion;
    await enqueueStorageOperation(async () => {
      if (requestVersion !== sessionVersion) return;
      await deleteItem('token');
      if (requestVersion !== sessionVersion) return;
      await deleteItem('user');
      if (requestVersion === sessionVersion) {
        set({ user: null, token: null });
      }
    });
  },

  logoutIfTokenMatches: async (token) => {
    if (get().token !== token) return false;

    const requestVersion = ++sessionVersion;
    set({ user: null, token: null });
    await enqueueStorageOperation(async () => {
      if (requestVersion !== sessionVersion) return;
      await deleteItem('token');
      if (requestVersion !== sessionVersion) return;
      await deleteItem('user');
    });
    return true;
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
        if (isTokenExpired(token)) {
          await deleteItem('token');
          await deleteItem('user');
          set({ user: null, token: null });
          return;
        }
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
