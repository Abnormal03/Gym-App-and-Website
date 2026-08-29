import { TouchableOpacity, ActivityIndicator, Text } from "react-native";
interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
}

export const Button = ({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      //   style={[styles.base, styles[variant], disabled && styles.disabled]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text>{label}</Text>}
    </TouchableOpacity>
  );
};
