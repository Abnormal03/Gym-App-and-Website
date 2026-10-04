import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "./useAuth";
import { useAuthStore } from "../store/auth.store";

export function useAuthRedirect() {
  const { trainer, isLoading, hydrate } = useAuthStore();
  const { loadProgress } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [isCheckingProgress, setIsCheckingProgress] = useState(true);
  const [hasPendingTrainer, setHasPendingTrainer] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const checkPendingProgress = async () => {
      try {
        const pendingTrainer = await loadProgress();
        setHasPendingTrainer(!!pendingTrainer);
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsCheckingProgress(false);
      }
    };

    checkPendingProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (isLoading || isCheckingProgress) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isFinishProfileRoute = segments.includes("finish-profile");

    if (hasPendingTrainer && trainer && !isFinishProfileRoute) {
      router.replace("/(auth)/finish-profile");
      return;
    }

    if (!trainer && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (trainer && inAuthGroup) {
      router.replace("/(drawer)/(tabs)");
    }
  }, [trainer, isLoading, isCheckingProgress, hasPendingTrainer, segments, router]);

  return isLoading || isCheckingProgress;
}
