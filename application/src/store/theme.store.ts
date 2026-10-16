import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { ThemeMode } from "../constants/colors";

export type ThemePreference = ThemeMode | "system";

interface ThemeState {
  preference: ThemePreference;
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const STORAGE_KEY = "themePreference";

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  hasHydrated: false,

  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        set({ preference: saved });
      }
    } catch {
      // Keep the system theme if local preference storage is unavailable.
    } finally {
      set({ hasHydrated: true });
    }
  },

  setPreference: async (preference) => {
    set({ preference });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Apply the selection for this session even if persistence is unavailable.
    }
  },
}));
