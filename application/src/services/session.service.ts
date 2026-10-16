import api, { unwrapApiResponse } from './api';
import { ProviderSession, SessionStatus } from '../types/session.types';

export interface CreateProviderSessionDTO {
  purchaseId: number;
  startsAt: string;
}

export const sessionService = {
  getMine: async (status?: SessionStatus): Promise<ProviderSession[]> => {
    const response = await api.get<{
      success: boolean;
      sessions: ProviderSession[];
    } | { data: { success: boolean; sessions: ProviderSession[] } }>('/sessions', { params: status ? { status } : {} });

    const normalized = unwrapApiResponse(response) as { success?: boolean; sessions?: ProviderSession[] };
    if (!normalized?.success || !Array.isArray(normalized.sessions)) {
      throw new Error('Sessions not found in API response');
    }
    return normalized.sessions;
  },

  schedule: (bookingId: number, data: CreateProviderSessionDTO) =>
    api.post<{ success: boolean; session: ProviderSession }>(
      `/bookings/${bookingId}/sessions`,
      data,
    ),

  review: (
    sessionId: number,
    data: { rating: number; comment?: string },
  ) =>
    api.post<{ success: boolean; message: string }>(
      `/sessions/${sessionId}/review`,
      data,
    ),
};
