import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Key used to persist pending booking across app restarts (Option B)
const PENDING_BOOKING_KEY = 'pendingBooking';

interface PendingBooking {
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
  setBookingDetails: (details: Partial<BookingState>) => void;
  savePendingBooking: (data: PendingBooking) => Promise<void>;
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
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setBookingDetails: (details) =>
    set((state) => ({ ...state, ...details })),

  savePendingBooking: async (data) => {
    await SecureStore.setItemAsync(PENDING_BOOKING_KEY, JSON.stringify(data));
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
  },

  loadPendingBooking: async () => {
    try {
      const raw = await SecureStore.getItemAsync(PENDING_BOOKING_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PendingBooking;
    } catch {
      return null;
    }
  },

  clearPendingBooking: async () => {
    await SecureStore.deleteItemAsync(PENDING_BOOKING_KEY);
    set(initialState);
  },

  reset: () => set(initialState),
}));