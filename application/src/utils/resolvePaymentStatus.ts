// src/utils/resolvePaymentStatus.ts
import { PaymentStatus, VerifyPaymentResult } from '../types/booking.types';

export const resolvePaymentStatus = (
  result: VerifyPaymentResult,
  countdownExpired: boolean
): PaymentStatus => {

  if (
    result.localStatus === 'success' ||
    result.chapaStatus === 'success' ||
    result.bookingStatus === 'confirmed'
  ) {
    return 'success';
  }

  if (result.localStatus === 'failed' || result.chapaStatus === 'failed') {
    return 'failed';
  }

  if (
    result.bookingStatus === 'cancelled' &&
    result.localStatus === 'pending'
  ) {
    return 'expired';
  }
  if (countdownExpired) {
    return 'expired';
  }

  // Still waiting
  return 'pending';
};