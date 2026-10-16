import { useLocalSearchParams } from "expo-router";
import { ProviderProfileScreen } from "../../../src/components/providers/ProviderProfileScreen";

export default function PhysiotherapistProfileRoute() {
  const { physiotherapistId } = useLocalSearchParams<{ physiotherapistId: string }>();
  const id = Number(physiotherapistId);
  return (
    <ProviderProfileScreen
      providerId={Number.isSafeInteger(id) && id > 0 ? id : null}
      type="PHYSIOTHERAPIST"
    />
  );
}
