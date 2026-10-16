import api from './api';
import {
  CheckoutRequest,
  CheckoutQuoteResponse,
  CreateCheckoutResponse,
  CreateBookingDTO,
  CreateBookingResponse,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  MyBooking
} from '../types/booking.types';


export const bookingService = {
  quoteCheckout: (data: CheckoutRequest): Promise<CheckoutQuoteResponse> =>
    api.post<CheckoutQuoteResponse, CheckoutQuoteResponse>('/checkout/quote', data),

  createCheckout: (data: CheckoutRequest): Promise<CreateCheckoutResponse> =>
    api.post<CreateCheckoutResponse, CreateCheckoutResponse>('/checkout', data),

  // Step 1 — creates the booking record
  create: (data: CreateBookingDTO): Promise<CreateBookingResponse> =>
    api.post('/bookings', data),

  // Step 2 — initializes Chapa payment for a confirmed booking
  initializePayment: (bookingId: number): Promise<InitializePaymentResponse> =>
    api.post('/payments/initialize', { bookingId }),

  verifyPayment: (txRef: string): Promise<VerifyPaymentResponse> =>
    api.get(`/payments/verify/${encodeURIComponent(txRef)}`, {
      timeout: 40_000,
    }),

  getMyBookings: (): Promise<{ success: boolean; bookings: MyBooking[] }> =>
    api.get('/bookings/my-bookings'),

  // Includes booked provider sessions and consultation assignment details.
  getMemberBookings: (): Promise<{ success: boolean; bookings: MyBooking[] }> =>
    api.get('/bookings'),

  cancel: (id: number) =>
    api.put(`/bookings/${id}/cancel`),
};
