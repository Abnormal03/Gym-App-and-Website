import { useLocalSearchParams } from "expo-router";
import { ProviderProfileScreen } from "../../../src/components/providers/ProviderProfileScreen";

export default function TrainerProfileRoute() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const id = Number(trainerId);
  return (
    <ProviderProfileScreen
      providerId={Number.isSafeInteger(id) && id > 0 ? id : null}
      type="TRAINER"
    />
  );
}
