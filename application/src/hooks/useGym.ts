import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

const GYM_LIST_CACHE_KEY = 'gyms:list';
const GYM_COORDINATES_CACHE_KEY = 'gyms:coordinates:v1';
export const NEARBY_GYM_RADIUS_KM = 10;
export const NEARBY_GYM_FALLBACK_RADIUS_KM = 25;
const COORDINATE_FETCH_BATCH_SIZE = 4;
const COORDINATE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;

type Coordinates = { latitude: number; longitude: number };
type CachedCoordinate = Coordinates & { cachedAt: number };

const isValidCoordinates = (value: Partial<Coordinates>): value is Coordinates =>
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude) &&
  value.latitude! >= -90 &&
  value.latitude! <= 90 &&
  value.longitude! >= -180 &&
  value.longitude! <= 180;

const distanceKm = (from: Coordinates, to: Coordinates) => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(value));
};

const readCoordinateCache = async (): Promise<Record<string, CachedCoordinate>> => {
  try {
    const raw = await AsyncStorage.getItem(GYM_COORDINATES_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, CachedCoordinate>)
      : {};
  } catch {
    return {};
  }
};

export const useGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDetails, setGymDetails] = useState<Gym | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [nearMeExpanded, setNearMeExpanded] = useState(false);
  const requestOrder = useRef(0);
  const hasCachedGyms = useRef(false);

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Something went wrong';
  };

  useEffect(() => {
    if (!searchError || gyms.length === 0) return;
    const errorTimeout = setTimeout(() => setSearchError(null), 5000);
    return () => clearTimeout(errorTimeout);
  }, [searchError, gyms.length]);

  const getGyms = async () => {
    const requestId = ++requestOrder.current;
    setNearMe(false);
    setNearMeError(null);
    setNearMeExpanded(false);
    if (!hasCachedGyms.current) {
      setLoading(true);
      try {
        const cached = await AsyncStorage.getItem(GYM_LIST_CACHE_KEY);
        if (cached) {
          const parsed: unknown = JSON.parse(cached);
          if (Array.isArray(parsed) && requestId === requestOrder.current) {
            setGyms(parsed as Gym[]);
            hasCachedGyms.current = true;
            setLoading(false);
          }
        }
      } catch {
        // A malformed cache should not prevent the network request.
      }
    }
    setError(null);
    setSearching(false);
    setSearchError(null);

    try {
      const response = await gymService.getAll();
      if (requestId === requestOrder.current) {
        setGyms(response);
        hasCachedGyms.current = true;
        void AsyncStorage.setItem(GYM_LIST_CACHE_KEY, JSON.stringify(response)).catch(() => undefined);
      }
    } catch (err) {
      if (requestId === requestOrder.current) setError(getErrorMessage(err));
    } finally {
      if (requestId === requestOrder.current) setLoading(false);
    }
  };

  const getGymDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const details = await gymService.getById(id);
      setGymDetails(details);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const searchGymByNameAndLocation = async (nameloc: string) => {
    const requestId = ++requestOrder.current;
    setNearMe(false);
    setNearMeError(null);
    setNearMeExpanded(false);
    setLoading(false);
    setError(null);
    setSearching(true);
    setSearchError(null);
    try {
      const byName = await gymService.searchGyms(nameloc, '');
      if (requestId !== requestOrder.current) return;
      if (byName.success && byName.message) {
        const byLocation = await gymService.searchGyms('', nameloc);
        if (requestId !== requestOrder.current) return;
        if (byLocation.message) setSearchError(byLocation.message);
        if (byLocation.success) setGyms(byLocation.gyms);
      } else if (!byName.success && byName.message) {
        setSearchError(byName.message);
      }
      if (byName.success && !byName.message) setGyms(byName.gyms);
    } catch (err) {
      if (requestId === requestOrder.current) setSearchError(getErrorMessage(err));
    } finally {
      if (requestId === requestOrder.current) setSearching(false);
    }
  };

  const getGymsNearMe = async () => {
    const requestId = ++requestOrder.current;
    setNearMeLoading(true);
    setNearMeError(null);
    setNearMeExpanded(false);
    setError(null);
    setSearchError(null);
    setSearching(false);

    try {
      if (Platform.OS === 'web') {
        // Browser geolocation prompts for permission when invoked. Expo's web
        // permission query is missing in some browsers, so bypass that API.
        if (typeof window === 'undefined' || !window.isSecureContext) {
          throw new Error('Near me requires HTTPS (or localhost) in your browser.');
        }
        if (!('geolocation' in navigator)) {
          throw new Error('This browser does not support location access.');
        }
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Allow location access to find gyms within 25 km.');
        }
      }

      const locationRequest = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let locationTimeout: ReturnType<typeof setTimeout> | undefined;
      const position = await Promise.race([
        locationRequest,
        new Promise<Awaited<typeof locationRequest>>((_, reject) => {
          locationTimeout = setTimeout(
            () => reject(Object.assign(new Error('Location lookup timed out. Try again in a moment.'), { code: 3 })),
            15_000,
          );
        }),
      ]).finally(() => {
        if (locationTimeout) clearTimeout(locationTimeout);
      });
      const memberLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const candidates = await gymService.getAll();
      if (requestId !== requestOrder.current) return;
      const coordinateCache = await readCoordinateCache();
      const coordinateByGymId = new Map<number, Coordinates>();
      const missingCoordinates: Gym[] = [];

      for (const gym of candidates) {
        if (isValidCoordinates(gym)) {
          coordinateByGymId.set(gym.id, {
            latitude: gym.latitude,
            longitude: gym.longitude,
          });
          continue;
        }

        const cached = coordinateCache[String(gym.id)];
        if (cached && Date.now() - cached.cachedAt <= COORDINATE_CACHE_MAX_AGE_MS && isValidCoordinates(cached)) {
          coordinateByGymId.set(gym.id, cached);
        } else {
          missingCoordinates.push(gym);
        }
      }

      // The list endpoint omits coordinates; hydrate them through the existing
      // detail endpoint, with bounded concurrency, and cache successful results.
      for (let index = 0; index < missingCoordinates.length; index += COORDINATE_FETCH_BATCH_SIZE) {
        const batch = missingCoordinates.slice(index, index + COORDINATE_FETCH_BATCH_SIZE);
        await Promise.all(batch.map(async (gym) => {
          try {
            const details = await gymService.getById(gym.id);
            if (!isValidCoordinates(details)) return;
            const coordinates = {
              latitude: details.latitude,
              longitude: details.longitude,
            };
            coordinateByGymId.set(gym.id, coordinates);
            coordinateCache[String(gym.id)] = { ...coordinates, cachedAt: Date.now() };
          } catch {
            // A gym without readable coordinates is omitted from this local filter.
          }
        }));
        if (requestId !== requestOrder.current) return;
      }

      void AsyncStorage.setItem(GYM_COORDINATES_CACHE_KEY, JSON.stringify(coordinateCache)).catch(() => undefined);
      const gymsWithDistance = candidates
        .flatMap((gym) => {
          const coordinates = coordinateByGymId.get(gym.id);
          if (!coordinates) return [];
          const distance = distanceKm(memberLocation, coordinates);
          return [{
            ...gym,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            distanceKm: distance,
          }];
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const nearbyWithin10Km = gymsWithDistance.filter(
        (gym) => gym.distanceKm <= NEARBY_GYM_RADIUS_KM,
      );
      const nearby = nearbyWithin10Km.length > 0
        ? nearbyWithin10Km
        : gymsWithDistance.filter(
            (gym) => gym.distanceKm <= NEARBY_GYM_FALLBACK_RADIUS_KM,
          );

      setGyms(nearby);
      setNearMe(true);
      setNearMeExpanded(nearbyWithin10Km.length === 0 && nearby.length > 0);
      hasCachedGyms.current = true;
      if (nearbyWithin10Km.length === 0 && nearby.length > 0) {
        setNearMeError('No gyms were found within 10 km. Showing gyms within 25 km.');
      } else if (nearby.length === 0) {
        setNearMeError('No gyms with saved locations were found within 25 km.');
      }
      void AsyncStorage.setItem(GYM_LIST_CACHE_KEY, JSON.stringify(candidates)).catch(() => undefined);
    } catch (err) {
      if (requestId === requestOrder.current) {
        const code = err && typeof err === 'object' && 'code' in err
          ? Number((err as { code?: unknown }).code)
          : undefined;
        const message = Platform.OS === 'web'
          ? code === 1
            ? 'Location access was blocked. Allow it in your browser site settings, then try again.'
            : code === 2
              ? 'Your browser could not determine your location. Check device location services and try again.'
              : code === 3
                ? 'Location lookup timed out. Try again in a moment.'
                : getErrorMessage(err)
          : getErrorMessage(err);
        setNearMeError(message);
        setNearMe(false);
        setNearMeExpanded(false);
      }
    } finally {
      if (requestId === requestOrder.current) setNearMeLoading(false);
    }
  };

  return {
    getGyms,
    getGymDetails,
    gymDetails,
    gyms,
    loading,
    error,
    searching,
    searchError,
    searchGymByNameAndLocation,
    getGymsNearMe,
    nearMe,
    nearMeLoading,
    nearMeError,
    nearMeExpanded,
  };
};
