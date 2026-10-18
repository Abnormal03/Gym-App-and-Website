export interface User {
    id: number;
    name: string;
    phone?: string;
    email: string;
    photoUrl?: string;
    fcmToken?: string;
    expoPushToken?: string | null;
    totalBookings?:number;
    createdAt: string;   
    preference: Preference 
}

export interface Preference{
  bookingConfirm: boolean,
  sessionReminders: boolean,
  offersAndPromotions: boolean
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

export interface UpdateProfileDTO {
  name?: string;
  phone?: string;
  photoUrl?: string;
  expoPushToken?: string | null;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}