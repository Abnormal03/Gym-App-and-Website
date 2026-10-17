export type SessionStatus =
  | 'HELD'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface ProviderSession {
  id: number;
  purchaseId: number;
  bookingId: number;
  providerId: number;
  userId: number;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  booking?: {
    id: number;
    gym: { id: number; name: string };
    package: { id: number; name: string };
  };
  provider?: { id: number; name: string };
  purchase?: { id: number; sessionsRemaining: number };
  review?: { id: number; rating: number; comment: string | null; createdAt: string } | null;
}
