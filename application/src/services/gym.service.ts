// src/services/gym.service.ts
import api from './api';
import { Availability, Gym, GymDetailsResponse, GymListResponse } from '../types/gym.types';

const normalizeGymList = (payload: Gym[] | GymListResponse): Gym[] => {
  if (Array.isArray(payload)) return payload;
  return payload?.gyms ?? [];
};

const normalizeGymDetails = (payload: Gym | GymDetailsResponse): Gym => {
  if (!('success' in payload) && payload !== null && typeof payload === 'object') {
    return payload as Gym;
  }

  if ('gymDetails' in payload && payload.gymDetails) {
    return payload.gymDetails;
  }

  throw new Error('Gym details not found in API response');
};

const normalizeAvailability = (payload: Availability | any): Availability=>{
  if ('availability' in payload && payload.availability) {
    return payload.availability
  }
  throw new Error('Gym Availability not found in API response')
}

export const gymService = {
  getAll: async (): Promise<Gym[]> => {
    const response = await api.get('/gyms');
    return normalizeGymList(response as unknown as Gym[] | GymListResponse)
  },

  getById: async (id: number): Promise<Gym> => {
    const response = await api.get(`/gyms/${id}`);
    return normalizeGymDetails(response as unknown as Gym | GymDetailsResponse);
  },

  getAvailability: async (id: number, slotStart: string, slotEnd: string) =>{
    const response = await api.get(`/gyms/${id}/availability`, {
            params: { slot_start: slotStart, slot_end: slotEnd }
          })
    return normalizeAvailability(response as unknown as Availability | any)
  }
    
};