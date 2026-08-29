export interface Gym {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  openingTime: string;
  closingTime: string;
  capacity: number;
  photos: string[];
  amenities: string[];
  packages: Package[];
}

export interface Package {
  id: number;
  gymId: number;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'annual';
  price: number;
  durationDays: number;
  benefits?: string;
}