import api from './api';
import { User, UpdateProfileDTO, ChangePasswordDTO } from '../types/user.types';

export const userService = {
  getProfile: async (): Promise<{ success: boolean; user: User }> =>
    api.get('/users/me')
  ,

  updateProfile: (
    data: UpdateProfileDTO
  ): Promise<{ success: boolean; user: User }> =>
    api.put('/users/me', data),

  changePassword: (data: ChangePasswordDTO): Promise<{ success: boolean }> =>
    api.put('/users/change-password', data),

  deleteAccount: (): Promise<{ success: boolean; message: string }> =>
    api.delete('/users/me'),
};