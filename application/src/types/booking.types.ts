// src/types/booking.types.ts
export interface Booking {
  id: number;
  gymId: number;
  packageId?: number;
  slotStart: string;
  slotEnd: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
  qrCode?: string;
  gym: { name: string; address: string };
  package?: { name: string };
}

export interface CreateBookingDTO {
  gym_id: number;
  package_id?: number;
  slot_start: string;
  slot_end: string;
}