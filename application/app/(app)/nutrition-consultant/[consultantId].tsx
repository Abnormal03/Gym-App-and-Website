import { useLocalSearchParams } from "expo-router";
import { ProviderProfileScreen } from "../../../src/components/providers/ProviderProfileScreen";

export default function NutritionConsultantProfileScreen() {
  const { consultantId } = useLocalSearchParams<{ consultantId: string }>();
  const id = Number(consultantId);

  return (
    <ProviderProfileScreen
      providerId={Number.isSafeInteger(id) && id > 0 ? id : null}
      type="NUTRITION_CONSULTANT"
    />
  );
}
