// src/services/gym.service.ts
import api from './api';
import { Gym } from '../types/gym.types';

export const gymService = {
  getAll: (): Promise<Gym[]> =>
    api.get('/gyms'),

  getById: (id: number): Promise<Gym> =>
    api.get(`/gyms/${id}`),

  getAvailability: (id: number, slotStart: string, slotEnd: string) =>
    api.get(`/gyms/${id}/availability`, {
      params: { slot_start: slotStart, slot_end: slotEnd }
    }),
};