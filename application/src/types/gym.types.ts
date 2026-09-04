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