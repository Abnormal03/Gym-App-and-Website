import api from './api';
import { User, UpdateProfileDTO, ChangePasswordDTO } from '../types/user.types';

export const userService = {
  getProfile: (): Promise<{ success: boolean; user: User }> =>
    api.get('/users/me'),

  updateProfile: (
    data: UpdateProfileDTO
  ): Promise<{ success: boolean; user: User }> =>
    api.put('/users/me', data),

  changePassword: (data: ChangePasswordDTO): Promise<{ success: boolean }> =>
    api.put('/users/change-password', data),
};