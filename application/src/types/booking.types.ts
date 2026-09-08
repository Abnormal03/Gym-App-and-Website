// src/types/booking.types.ts

export interface CreateBookingDTO {
  gymId: number;
  packageId: number;
  slotStart: string;
  slotEnd: string;
}

// Response from POST /bookings
export interface CreateBookingResponse {
  success: boolean;
  message: string;
  booking: {
    id: number;
    userId: number;
    gymId: number;
    packageId: number;
    slotStart: string;
    slotEnd: string;
    status: string;
    qrCode: string | null;
    createdAt: string;
  };
}

// Response from POST /payments/initialize
export interface InitializePaymentResponse {
  success: boolean;
  message: string;
  checkoutUrl: string;
  txRef: string;
  payment: {
    id: number;
    userId: number;
    bookingId: number;
    amount: number;
    currency: string;
    status: string;
    chapaTxRef: string;
    chapaCheckoutUrl: string;
    createdAt: string;
  };
}

// What your verify endpoint returns
export interface VerifyPaymentResult {
  localStatus: 'pending' | 'success' | 'failed';
  chapaStatus: 'success' | 'failed' | null;
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
  qrCode: string | null;
}

export interface VerifyPaymentResponse {
  success: boolean;
  result: VerifyPaymentResult;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';