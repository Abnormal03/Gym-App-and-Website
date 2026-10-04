import { Slot } from "expo-router";
import { useAuthRedirect } from "../../src/hooks/useAuthRedirect";

export default function AuthLayout() {
  const isCheckingAuth = useAuthRedirect();

  if (isCheckingAuth) return null;

  return <Slot />;
}
