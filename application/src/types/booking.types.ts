// src/types/booking.types.ts


export interface CheckoutRequest {
  gymId: number;
  packageId: number;
  bookingType: 'SINGLE' | 'GROUP';
  headcount: number;
  startsAt: string;
  durationMinutes: number;
  provider?: {
    providerId: number;
    providerPackageId: number;
    firstSessionStartsAt: string;
  };
  consultation?: { consultantId: number };
}

export interface CheckoutQuoteItem {
  type: string;
  label: string;
  amount: number | string;
}

export interface CheckoutQuoteResponse {
  success: boolean;
  data: {
    items: CheckoutQuoteItem[];
    total: number | string;
  };
}

export interface CreateCheckoutResponse {
  success: boolean;
  data: {
    orderId: number;
    bookingId: number;
    totalAmount: number | string;
    currency: string;
    status: string;
    expiresAt: string;
    items: Array<{ id: number; orderId: number; type: string; amount: number | string }>;
    checkoutUrl: string | null;
    requiresPayment: boolean;
  };
}

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

export interface MemberPaymentHistoryEntry {
  id: number;
  bookingId: number;
  amount: number | string;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  transactionReference: string | null;
  createdAt: string;
  updatedAt: string | null;
  booking: {
    id: number;
    status: MyBooking['status'];
    slotStart: string;
    slotEnd: string;
    createdAt: string;
    gym: { id: number; name: string; address: string };
    package: { id: number; name: string; type: string } | null;
    order: {
      id: number;
      totalAmount: number | string;
      needsManualRefund: boolean;
      refundNote: string | null;
      items: Array<{
        id: number;
        type: string;
        label: string;
        amount: number | string;
      }>;
    } | null;
  };
}

export interface MyBooking {
  id: number;
  gymId: number;
  packageId: number | null;
  slotStart: string;
  slotEnd: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'expired' | 'payment_failed';
  qrCode: string | null;
  createdAt: string;
  bookingType?: 'SINGLE' | 'GROUP';
  headcount?: number;
  gym: {
    id: number;
    name: string;
    address: string;
    photos: string[];
  };
  package: {
    id: number;
    name: string;
    type: string;
    price: number;
  } | null;
  packageName?: string | null;
  order?: {
    id: number;
    totalAmount: number | string;
    items: Array<{
      id: number;
      type: string;
      label: string;
      amount: number | string;
      provider?: { id: number; name: string; type?: string } | null;
      purchase?: { id: number; packageName?: string | null } | null;
      consultation?: {
        status: string;
        consultant?: { id: number; name: string } | null;
        startsAt?: string | null;
        expiresAt?: string | null;
      } | null;
    }>;
  } | null;
  sessions?: Array<{
    id: number;
    providerId: number;
    providerName: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
    provider?: { id: number; name: string; type?: string } | null;
  }>;
  consultation?: Array<{
    status: string;
    consultant: { id: number; name: string } | null;
    startsAt?: string | null;
    expiresAt?: string | null;
  }>;
}
