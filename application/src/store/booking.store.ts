// src/store/booking.store.ts
import { create } from 'zustand';

interface BookingState {
  gymId: number | null;
  gymName: string | null;
  packageId: number | null;
  packageName: string | null;
  packagePrice: number | null;
  slotStart: string | null;
  slotEnd: string | null;
  checkoutUrl: string | null;
  setBookingDetails: (details: Partial<BookingState>) => void;
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
  checkoutUrl: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  setBookingDetails: (details) =>
    set((state) => ({ ...state, ...details })),
  reset: () => set(initialState),
}));