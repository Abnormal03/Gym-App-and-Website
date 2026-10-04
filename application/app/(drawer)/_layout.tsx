import { useRouter } from "expo-router";
import Drawer, { DrawerContentScrollView } from "expo-router/drawer";
import { Text, View } from "react-native";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthRedirect } from "../../src/hooks/useAuthRedirect";

interface DrawerContentProps {
  navigation: {
    closeDrawer: () => void;
  };
}

const DrawerContent = ({ navigation }: DrawerContentProps) => {
  const { theme } = useTheme();
  return (
    <DrawerContentScrollView
      contentContainerStyle={[{ flex: 1, backgroundColor: theme.background }]}
    >
      <Text>Profile Section</Text>
      <Text>settings</Text>
      <Text>logout</Text>
    </DrawerContentScrollView>
  );
};

export default function DrawerLayout() {
  const { theme } = useTheme();
  const isCheckingAuth = useAuthRedirect();

  if (isCheckingAuth) return null;

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 300,
          backgroundColor: theme.background,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    />
  );
}
