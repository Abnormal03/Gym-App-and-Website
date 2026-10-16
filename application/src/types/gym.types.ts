export interface Gym {
  id: number;
  adminId?: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  openingTime: string;
  closingTime: string;
  capacity: number;
  photos: string[];
  amenities: string[];
  packages?: Package[];
  isActive?: boolean;
  createdAt?: string;
  _count?: {
    bookings?: number;
  };
}

export interface GymListResponse {
  success: boolean;
  gyms?: Gym[];
}

export interface GymDetailsResponse {
  success: boolean;
  gymDetails?: Gym;
}

export interface Package {
  id: number;
  gymId: number;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'annual';
  price: number;
  durationDays: number;
  benefits?: string;
  isActive: boolean;
}

export interface Availability {
  capacity: number;
  booked: number;
  available: number;
}

export interface GymSearchResponse {
  success: boolean;
  message?: string;
  gyms: Gym[],
}

export type ProviderType =
  | 'TRAINER'
  | 'PHYSIOTHERAPIST'
  | 'NUTRITION_CONSULTANT';

/** Public provider fields returned by member-facing provider endpoints. */
export interface Provider {
  id: number;
  name: string;
  type?: ProviderType;
  rating?: number;
  ratingAvg: number;
  ratingCount: number;
  experienceYears: number | null;
  specialization?: string | null;
  specializations: string[];
  profilePhotoUrl?: string | null;
  photoUrl?: string | null;
  sessionPrice?: number | string | null;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  bio?: string | null;
  certifications: string[];
  sessionsCompleted: number;
  /** Valid provider session starts within the requested gym booking window. */
  validSessionStarts?: string[];
  gym?: { id: number; name: string; address?: string | null } | null;
}

export interface ProviderPackage {
  id: number;
  name: string;
  price: number;
  duration?: number;
  durationDays?: number;
  sessions?: number;
  [key: string]: unknown;
}

export interface ProviderReview {
  id: number;
  rating: number;
  comment?: string | null;
  reviewerFirstName?: string | null;
  createdAt: string;
}

export interface ProviderReviewsResponse {
  success: boolean;
  data: { items: ProviderReview[]; [key: string]: unknown };
}
