export interface User {
    id: number;
    name: string;
    phone: number;
    email: string;
    photoUrl?: string;
    fcmToken?: string;
    createdSt: string
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  phone?: string;
  password: string;
}