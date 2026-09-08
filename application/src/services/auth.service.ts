import api from './api';
import { AuthResponse, LoginDTO, RegisterDTO } from '../types/user.types';

export const authService = {
  register: (data: RegisterDTO): Promise<AuthResponse> =>
    api.post('/auth/register', data),

  login: (data: LoginDTO): Promise<AuthResponse> =>
    api.post('/auth/login', data),
};