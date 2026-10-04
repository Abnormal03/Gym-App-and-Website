export interface Trainer {
    id: number;
    gymId?: number | null;
    name: string;
    email: string;
    profilePhotoUrl?: string|null;
    phone?: string;
    bio?: string;
    specialization?: string;
    experienceYears?: number;
    sessionPrice?: number |null;
    verificationStatus: string;
    rating?: number;
    createdAt?: string;
    fcmToken?: string;
    preference?: Preference;
}

export interface PendingTrainer {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface Preference{
  bookingConfirm: boolean,
  sessionReminders: boolean,
  offersAndPromotions: boolean
}

export interface registerDTO{
    name: string;
    email: string;
    phone: string;
    password: string;
    bio: string;
    specialization: string;
    experienceYears: number;
}
export interface loginDTO{
    email:string,
    password: string
}

export interface AuthResponse {
  success: boolean;
  message: string;
  trainer: Trainer;
  token: string;
}

export interface ProfileResponse {
  success: boolean,
  message: string,
  trainer: Trainer
}