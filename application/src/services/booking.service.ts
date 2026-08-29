import api from './api';
import { CreateBookingDTO } from '../types/booking.types'

export const bookingService = {
  create: (data: CreateBookingDTO) =>
    api.post('/bookings', data),

  getMyBookings: () =>
    api.get('/bookings/my'),

  cancel: (id: number) =>
    api.put(`/bookings/${id}/cancel`),
};