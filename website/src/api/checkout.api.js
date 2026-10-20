import { api } from './client';
import { PAYMENT_INIT_KEY } from '../config/apiShape';

export const checkoutApi = {
  quote: async (body) => (await api.post('/api/checkout/quote', body)).data,
  // Creates the order + pending booking. Never retried automatically.
  create: async (body) => (await api.post('/api/checkout', body)).data,
  // checkoutUrl from /checkout is always null; this returns the Chapa URL.
  initPayment: (bookingId) => api.post('/api/payments/initialize', { [PAYMENT_INIT_KEY]: bookingId }),
  verify: async (txRef) => (await api.get(`/api/payments/verify/${encodeURIComponent(txRef)}`)).result,
  order: async (id) => (await api.get(`/api/orders/${id}`)).order,
};
