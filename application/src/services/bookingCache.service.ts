import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MyBooking } from "../types/booking.types";

const cacheKeyFor = (memberId: number) => `memberBookings:${memberId}`;

export const saveOfflineConfirmedBooking = async (
  memberId: number,
  booking: MyBooking,
) => {
  const key = cacheKeyFor(memberId);
  const raw = await AsyncStorage.getItem(key);
  let cached: MyBooking[] = [];
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) cached = parsed as MyBooking[];
    } catch {
      // Replace malformed cache with the confirmed booking snapshot.
    }
  }
  const next = [booking, ...cached.filter((item) => item.id !== booking.id)];
  await AsyncStorage.setItem(key, JSON.stringify(next));
};

export const mergeCachedBookings = async (
  memberId: number | undefined,
  serverBookings: MyBooking[],
) => {
  if (!memberId) return serverBookings;
  try {
    const raw = await AsyncStorage.getItem(cacheKeyFor(memberId));
    if (!raw) return serverBookings;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return serverBookings;
    const serverIds = new Set(serverBookings.map((booking) => booking.id));
    const cachedConfirmed = (parsed as MyBooking[]).filter(
      (booking) => booking.status === "confirmed" && !serverIds.has(booking.id),
    );
    return [...serverBookings, ...cachedConfirmed];
  } catch {
    return serverBookings;
  }
};
