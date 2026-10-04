import React from "react";
import { FinalForm } from "../../src/components/profile/FinalForm";
import { Trainer } from "../../src/types/trainer.types";
import { useProfile } from "../../src/hooks/useProfile";
import { useAuthStore } from "../../src/store/auth.store";
import { useAuth } from "../../src/hooks/useAuth";
import { router, useRouter } from "expo-router";

export default function TrainerVerificationRoute() {
  const { updateProfile } = useProfile();
  const { deleteProgress } = useAuth();
  const { trainer } = useAuthStore();
  const router = useRouter();
  const handleSubmit = async (trainer: Trainer) => {
    const response = await updateProfile(trainer);
    if (response) {
      await deleteProgress();
    }
  };
  return (
    <FinalForm
      onSkip={() => {
        router.replace("(drawer)/(tabs)");
      }}
      onComplete={async (trainerProfile) =>
        trainer &&
        (await handleSubmit({
          profilePhotoUrl: trainerProfile?.photoUri,
          sessionPrice: Number(trainerProfile?.price),
          ...trainer,
        }))
      }
    />
  );
}
