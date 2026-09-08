import api from './api';
import {
  CreateBookingDTO,
  CreateBookingResponse,
  InitializePaymentResponse,
  VerifyPaymentResponse,
} from '../types/booking.types';

export const bookingService = {
  // Step 1 — creates the booking record
  create: (data: CreateBookingDTO): Promise<CreateBookingResponse> =>
    api.post('/bookings', data),

  // Step 2 — initializes Chapa payment for a confirmed booking
  initializePayment: (bookingId: number): Promise<InitializePaymentResponse> =>
    api.post('/payments/initialize', { bookingId }),

  verifyPayment: (txRef: string): Promise<VerifyPaymentResponse> =>
    api.get(`/payments/verify/${txRef}`),

  getMyBookings: () =>
    api.get('/bookings/my'),

  cancel: (id: number) =>
    api.put(`/bookings/${id}/cancel`),
};