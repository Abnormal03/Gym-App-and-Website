import { create } from 'zustand';

interface BookingState {
  gymId: number | null;
  packageId: number | null;
  slotStart: string | null;
  slotEnd: string | null;
  checkoutUrl: string | null;
  setBookingDetails: (details: Partial<BookingState>) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  gymId: null,
  packageId: null,
  slotStart: null,
  slotEnd: null,
  checkoutUrl: null,

  setBookingDetails: (details) => set((state) => ({ ...state, ...details })),
  reset: () => set({ gymId: null, packageId: null, slotStart: null, slotEnd: null, checkoutUrl: null }),
}));