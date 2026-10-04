import { useRouter } from "expo-router";
import { TrainerProfileForm } from "../../src/components/profile/TrainerProfileForm";

export default function TrainerProfileRoute() {
  const router = useRouter();
  return (
    <TrainerProfileForm
      loading={false}
      onContinue={() => {
        router.replace("/(auth)/finish-profile");
      }}
    />
  );
}
