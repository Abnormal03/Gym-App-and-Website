import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItem, readItem, writeItem } from '../services/auth.storage';

// Key used to persist pending booking across app restarts (Option B)
const PENDING_BOOKING_KEY = 'pendingBooking';
const PENDING_ADDONS_KEY = 'pendingBookingAddons';

export interface PendingBooking {
  txRef: string;
  bookingId: number;
  expiresAt: string;
  gymName: string;
  packageName: string;
  packagePrice: number;
  slotStart: string;
  slotEnd: string;
  checkoutUrl: string;
}

export type PendingSupportChoice =
  | {
      type: 'trainer';
      id: number;
      name: string;
      packageId: number;
      packageName: string;
      price: number;
    }
  | {
      type: 'physiotherapist';
      id: number;
      name: string;
      price: number | null;
    };

export interface PendingNutritionChoice {
  id: number;
  name: string;
  price: number;
}

interface PendingAddons {
  supportChoice: PendingSupportChoice | null;
  nutritionChoice: PendingNutritionChoice | null;
  nutritionSkipped: boolean;
}

export interface BookingState {
  gymId: number | null;
  gymName: string | null;
  packageId: number | null;
  packageName: string | null;
  packagePrice: number | null;
  slotStart: string | null;
  slotEnd: string | null;
  bookingId: number | null;
  txRef: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  durationHours: number | null;
  supportChoice: PendingSupportChoice | null;
  nutritionChoice: PendingNutritionChoice | null;
  nutritionSkipped: boolean;
  setBookingDetails: (details: Partial<BookingState>) => void;
  saveSupportChoice: (choice: PendingSupportChoice) => Promise<void>;
  clearSupportChoice: () => Promise<void>;
  saveNutritionChoice: (choice: PendingNutritionChoice) => Promise<void>;
  clearNutritionChoice: () => Promise<void>;
  resetPendingAddons: () => Promise<void>;
  hydratePendingAddons: () => Promise<void>;
  savePendingBooking: (data: PendingBooking) => Promise<boolean>;
  loadPendingBooking: () => Promise<PendingBooking | null>;
  clearPendingBooking: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  gymId: null,
  gymName: null,
  packageId: null,
  packageName: null,
  packagePrice: null,
  slotStart: null,
  slotEnd: null,
  bookingId: null,
  txRef: null,
  checkoutUrl: null,
  expiresAt: null,
  durationHours: null,
  supportChoice: null,
  nutritionChoice: null,
  nutritionSkipped: false,
};

const isPendingAddons = (value: unknown): value is PendingAddons => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const addons = value as Record<string, unknown>;
  const support = addons.supportChoice;
  const nutrition = addons.nutritionChoice;
  const isRecord = (candidate: unknown): candidate is Record<string, unknown> =>
    candidate !== null &&
    typeof candidate === 'object' &&
    !Array.isArray(candidate);

  let supportValid = support === null;
  if (isRecord(support)) {
    supportValid =
      typeof support.id === 'number' &&
      typeof support.name === 'string' &&
      (typeof support.price === 'number' || support.price === null) &&
      (support.type === 'trainer' || support.type === 'physiotherapist');
    if (support.type === 'trainer') {
      supportValid =
        supportValid &&
        typeof support.packageId === 'number' &&
        typeof support.packageName === 'string' &&
        typeof support.price === 'number';
    }
  }
  const nutritionValid =
    nutrition === null ||
    (isRecord(nutrition) &&
      typeof nutrition.id === 'number' &&
      typeof nutrition.name === 'string' &&
      typeof nutrition.price === 'number');

  return (
    supportValid &&
    nutritionValid &&
    typeof addons.nutritionSkipped === 'boolean'
  );
};

export const useBookingStore = create<BookingState>((set, get) => {
  let addonStorageQueue: Promise<void> = Promise.resolve();

  const updatePendingAddons = (
    update: (current: PendingAddons) => PendingAddons,
  ) => {
    const operation = addonStorageQueue.then(async () => {
      const current = {
        supportChoice: get().supportChoice,
        nutritionChoice: get().nutritionChoice,
        nutritionSkipped: get().nutritionSkipped,
      };
      const next = update(current);
      await AsyncStorage.setItem(PENDING_ADDONS_KEY, JSON.stringify(next));
      set(next);
    });
    addonStorageQueue = operation.catch(() => undefined);
    return operation;
  };

  return {
    ...initialState,

    setBookingDetails: (details) =>
      set((state) => ({ ...state, ...details })),

    saveSupportChoice: (supportChoice) =>
      updatePendingAddons((current) => ({ ...current, supportChoice })),

    clearSupportChoice: () =>
      updatePendingAddons((current) => ({ ...current, supportChoice: null })),

    saveNutritionChoice: (nutritionChoice) =>
      updatePendingAddons((current) => ({
        ...current,
        nutritionChoice,
        nutritionSkipped: false,
      })),

    clearNutritionChoice: () =>
      updatePendingAddons((current) => ({
        ...current,
        nutritionChoice: null,
        nutritionSkipped: true,
      })),

    resetPendingAddons: () =>
      updatePendingAddons(() => ({
        supportChoice: null,
        nutritionChoice: null,
        nutritionSkipped: false,
      })),

    hydratePendingAddons: async () => {
      const operation = addonStorageQueue.then(async () => {
        const raw = await AsyncStorage.getItem(PENDING_ADDONS_KEY);
        if (!raw) return;

        let addons: unknown = null;
        try {
          addons = JSON.parse(raw);
        } catch {
          addons = null;
        }
        if (!isPendingAddons(addons)) {
          await AsyncStorage.removeItem(PENDING_ADDONS_KEY);
          return;
        }
        set(addons);
      });
      addonStorageQueue = operation.catch(() => undefined);
      await operation;
    },

    savePendingBooking: async (data) => {
      await writeItem(PENDING_BOOKING_KEY, JSON.stringify(data));
      set({
        bookingId: data.bookingId,
        txRef: data.txRef,
        checkoutUrl: data.checkoutUrl,
        expiresAt: data.expiresAt,
        gymName: data.gymName,
        packageName: data.packageName,
        packagePrice: data.packagePrice,
        slotStart: data.slotStart,
        slotEnd: data.slotEnd,
      });

      return true
    },

    loadPendingBooking: async () => {
      try {
        const raw = await readItem(PENDING_BOOKING_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as PendingBooking;
      } catch {
        return null;
      }
    },

    clearPendingBooking: async () => {
      await deleteItem(PENDING_BOOKING_KEY);
      await AsyncStorage.removeItem(PENDING_ADDONS_KEY);
      set(initialState);
    },

    reset: () => set(initialState),
  };
});