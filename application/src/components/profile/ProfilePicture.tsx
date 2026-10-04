import { useTheme } from "../../hooks/useTheme";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from "react-native";
import { User } from "../../types/user.types";
import { Button } from "../common/Button";
import * as ImagePicker from "expo-image-picker";
import { useUpload } from "../../hooks/useUpload";
import { LoadingSpinner } from "../common/LoadingSpinner";

export interface props {
  user: User | null;
  profileLoading: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void>;
}

const ProfilePicture = ({
  onClose,
  onUploaded,
  user,
  profileLoading,
}: props) => {
  const { isDark, mode, theme } = useTheme();
  const { error, success, uploading, uploadImage } = useUpload();

  const pickImage = async () => {
    // const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // if (!permission.granted) {
    //   Alert.alert("Permission needed", "Permission to Gallary is Required.");
    //   return;
    // }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      const fileUri = asset.uri;
      const name = asset.fileName || fileUri.split("/").pop() || "upload.jpg";
      const filetype = asset.mimeType || "image/jpeg";

      const uploaded = await uploadImage({
        name,
        type: filetype,
        uri: fileUri,
      });
      if (uploaded) {
        onUploaded();
      }
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      style={{
        backgroundColor: theme.background,
        marginTop: 400,
      }}
    >
      {uploading || profileLoading ? (
        <LoadingSpinner mode={mode} size={"large"} color={theme.primary} />
      ) : (
        <View>
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ fontSize: 24, color: isDark ? "#fff" : "#111" }}>
              ✕
            </Text>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={{ marginBottom: 20 }}>
              <Image
                source={{ uri: user?.photoUrl }}
                style={{ width: 200, height: 200, borderRadius: 50 }}
              />
            </View>
            <Text style={[styles.avatarName, { color: theme.foreground }]}>
              {user?.name}
            </Text>
            <Text style={[styles.avatarEmail, { color: theme.muted }]}>
              {user?.email}
            </Text>
          </View>

          {/* Feedback messages */}
          {success && (
            <View
              style={[styles.successBanner, { backgroundColor: theme.input }]}
            >
              <Text style={[styles.successText, { color: theme.success }]}>
                ✓ {success}
              </Text>
            </View>
          )}
          {error && (
            <View
              style={[styles.errorBanner, { backgroundColor: theme.input }]}
            >
              <Text style={[styles.errorText, { color: theme.error }]}>
                {error}
              </Text>
            </View>
          )}
          <Button
            title="Change Profile"
            mode={mode}
            onPress={pickImage}
            variant="primary"
            style={{ width: "75%", alignSelf: "center", borderRadius: 50 }}
          />
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  open: {
    display: "contents",
    position: "absolute",
    justifyContent: "center",
    textAlign: "center",
    alignItems: "center",
    height: "100%",
  },
  close: {
    display: "none",
  },
  modalClose: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrapper: { marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#fff" },
  avatarName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  avatarEmail: { fontSize: 14 },
  successBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: "#2e7d32", fontSize: 14, fontWeight: "500" },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#c62828", fontSize: 14 },
});

export default ProfilePicture;
