import api, { unwrapApiResponse } from './api';
import {
  Provider,
  ProviderPackage,
  ProviderReviewsResponse,
  ProviderType,
} from '../types/gym.types';

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : {};

const normalizeProvider = (value: unknown): Provider => {
  const raw = asRecord(value);
  const rating = Number(raw.ratingAvg ?? raw.rating ?? raw.averageRating ?? 0);
  const specializations = Array.isArray(raw.specializations)
    ? raw.specializations.filter((item): item is string => typeof item === 'string')
    : typeof raw.specialization === 'string'
      ? [raw.specialization]
      : [];

  return {
    ...(raw as unknown as Provider),
    id: Number(raw.id),
    name: typeof raw.name === 'string' ? raw.name : 'Provider',
    rating: Number.isFinite(rating) ? rating : 0,
    ratingAvg: Number.isFinite(rating) ? rating : 0,
    ratingCount: Number(raw.ratingCount ?? raw.reviewCount ?? 0) || 0,
    experienceYears:
      typeof raw.experienceYears === 'number' ? raw.experienceYears : null,
    specializations,
    specialization: specializations.join(', ') || null,
    photoUrl:
      typeof raw.photoUrl === 'string'
        ? raw.photoUrl
        : typeof raw.profilePhotoUrl === 'string'
          ? raw.profilePhotoUrl
          : null,
    profilePhotoUrl:
      typeof raw.profilePhotoUrl === 'string'
        ? raw.profilePhotoUrl
        : typeof raw.photoUrl === 'string'
          ? raw.photoUrl
          : null,
    sessionPrice:
      typeof raw.sessionPrice === 'number' || typeof raw.sessionPrice === 'string'
        ? raw.sessionPrice
        : null,
    certifications: Array.isArray(raw.certifications)
      ? raw.certifications.filter((item): item is string => typeof item === 'string')
      : [],
    sessionsCompleted: Number(raw.sessionsCompleted ?? 0) || 0,
  };
};

const getPayload = (response: unknown): RecordValue => {
  const root = asRecord(unwrapApiResponse(response));
  const data = asRecord(root.data);
  return Object.keys(data).length ? data : root;
};

export const providerService = {
  search: async (filters: {
    gymId?: number;
    type?: ProviderType;
    name?: string;
    specialization?: string;
    startsAt?: string;
    endsAt?: string;
  }): Promise<Provider[]> => {
    const response = await api.get('/providers/search', {
      params: {
        ...(filters.gymId ? { gymId: filters.gymId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.name?.trim() ? { name: filters.name.trim() } : {}),
        ...(filters.specialization?.trim()
          ? { specialization: filters.specialization.trim() }
          : {}),
        ...(filters.startsAt ? { startsAt: filters.startsAt } : {}),
        ...(filters.endsAt ? { endsAt: filters.endsAt } : {}),
      },
    });
    const unwrapped = unwrapApiResponse(response);
    const root = asRecord(unwrapped);
    const payload = getPayload(response);
    const rows: unknown[] | undefined = Array.isArray(unwrapped)
      ? unwrapped
      : Array.isArray(root.data)
        ? root.data
        : Array.isArray(root.providers)
          ? root.providers
          : Array.isArray(payload.providers)
            ? payload.providers
            : undefined;

    if (!rows) {
      throw new Error('Providers not found in API response');
    }
    return rows.map(normalizeProvider).filter((provider) => Number.isSafeInteger(provider.id));
  },

  getById: async (providerId: number): Promise<Provider> => {
    const response = await api.get('/providers/' + providerId);
    const root = asRecord(unwrapApiResponse(response));
    const payload = getPayload(response);
    const provider = root.provider ?? payload.provider ?? payload;
    const normalized = normalizeProvider(provider);
    if (!Number.isSafeInteger(normalized.id)) {
      throw new Error('Provider not found in API response');
    }
    return normalized;
  },

  getPackages: async (providerId: number): Promise<ProviderPackage[]> => {
    const response = await api.get('/providers/' + providerId + '/packages');
    const root = asRecord(unwrapApiResponse(response));
    const payload = getPayload(response);
    const packages = Array.isArray(root.packages)
      ? root.packages
      : Array.isArray(payload.packages)
        ? payload.packages
        : [];
    return packages.filter(
      (item): item is ProviderPackage =>
        !!item &&
        typeof item === 'object' &&
        Number.isSafeInteger(Number((item as RecordValue).id)) &&
        typeof (item as RecordValue).name === 'string' &&
        Number.isFinite(Number((item as RecordValue).price)),
    ).map((item) => ({
      ...item,
      id: Number(item.id),
      price: Number(item.price),
      duration:
        typeof item.duration === 'number'
          ? item.duration
          : typeof item.durationDays === 'number'
            ? item.durationDays
            : undefined,
    }));
  },

  findById: async (
    providerId: number,
    type: ProviderType,
  ): Promise<Provider | null> => {
    const provider = await providerService.getById(providerId);
    return provider.type && provider.type !== type ? null : provider;
  },

  getReviews: async (
    providerId: number,
    page = 1,
    limit = 20,
  ): Promise<ProviderReviewsResponse['data']> => {
    const response = await api.get('/providers/' + providerId + '/reviews', {
      params: { page, limit },
    });
    const root = asRecord(unwrapApiResponse(response));
    const payload = getPayload(response);
    const result = root.data ?? payload;
    const record = asRecord(result);
    if (root.success === false || payload.success === false) {
      throw new Error('Provider reviews not found in API response');
    }
    return {
      ...record,
      items: Array.isArray(record.items) ? record.items as ProviderReviewsResponse['data']['items'] : [],
    };
  },
};
