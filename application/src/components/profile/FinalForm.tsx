import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../Common/Button";
import { Card } from "../Common/Card";
import { LoadingSpinner } from "../Common/LoadingSpinner";
import { radii, spacing, typography } from "../../constants/colors";
import MaterialIcons from "@react-native-vector-icons/material-icons";

import * as ImagePicker from "expo-image-picker";
import { useUpload } from "../../hooks/useUpload";
import { useAuth } from "../../hooks/useAuth";
type TrainerProfile = { photoUri?: string; price: string };
type Props = {
  onComplete?: (trainer: TrainerProfile) => Promise<void | null>;
  onSkip: () => void;
  loading?: boolean;
};
const presets = ["800", "1000", "1200", "1500"];

export function FinalForm({ onSkip, onComplete, loading = false }: Props) {
  const { theme } = useTheme();
  const [price, setPrice] = useState("1200");
  const { mode } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const { uploading, error, success, uploadImage } = useUpload();
  const { deleteProgress } = useAuth();

  const takeHome = useMemo(
    () => Math.round(Number(price) * 0.85).toLocaleString(),
    [price],
  );
  const operations = useMemo(
    () => Math.round(Number(price) * 0.15).toLocaleString(),
    [price],
  );

  const handleUpload = async () => {
    const pickedImage = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!pickedImage.canceled && pickedImage.assets[0]) {
      const image = pickedImage.assets[0];

      const fileUri = image.uri;
      const name = image.fileName || fileUri.split("/").pop() || "upload.jpg";
      const filetype = image.mimeType || "image/jpeg";

      const uploaded = await uploadImage({
        name,
        type: filetype,
        uri: fileUri,
      });
      if (uploaded) {
        setUrl(uploaded);
      }
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        {/* <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.back, { borderColor: theme.border }]}
        >
          <Text style={[styles.backText, { color: theme.foreground }]}>
            <MaterialIcons
              name="arrow-back"
              size={30}
              style={{ color: theme.foreground }}
            />
          </Text>
        </Pressable> */}
        <Text
          style={[
            styles.logo,
            { backgroundColor: theme.primary, position: "relative", left: 25 },
          ]}
        >
          <MaterialIcons name="fitness-center" size={30} />
        </Text>
        <View
          style={[
            styles.step,
            { borderColor: theme.primary, backgroundColor: theme.primary },
          ]}
        >
          <Text style={{ color: theme.card }}>• STEP 3/3</Text>
        </View>
      </View>
      <View style={styles.heading}>
        <View style={styles.badges}>
          <Text
            style={[
              styles.badge,
              { color: theme.foreground, borderColor: theme.border },
            ]}
          >
            TRAINER / COACH
          </Text>
          <Text
            style={[
              styles.badge,
              { color: theme.success, borderColor: theme.success },
            ]}
          >
            PRO VERIFICATION
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.foreground }]}>
          Profile Photo &amp; Rates
        </Text>
      </View>
      <Card mode={mode} style={styles.card}>
        <Text style={[styles.label, { color: theme.foreground }]}>
          OFFICIAL TRAINER PHOTO *
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload trainer photo"
          onPress={handleUpload}
          style={[
            styles.photoBox,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          {url ? (
            <View style={[styles.avatar, { borderColor: theme.border }]}>
              <Image
                src={url}
                style={{ height: 80, width: 80, borderRadius: 40 }}
              />
              <Text
                style={[
                  styles.avatarMiniCircle,
                  {
                    borderColor: theme.border,
                    color: theme.muted,
                    backgroundColor: theme.primary,
                  },
                ]}
              ></Text>
            </View>
          ) : (
            <View style={[styles.avatar, { borderColor: theme.border }]}>
              <MaterialIcons
                name="account-circle"
                size={80}
                style={{ color: theme.primary }}
              />
              <Text
                style={[
                  styles.avatarMiniCircle,
                  {
                    borderColor: theme.border,
                    color: theme.muted,
                    backgroundColor: theme.primary,
                  },
                ]}
              ></Text>
            </View>
          )}
          <Text
            style={[
              styles.upload,
              { color: theme.foreground, borderColor: theme.border },
            ]}
          >
            Upload Photo
          </Text>
        </Pressable>
        {uploading && (
          <View>
            <Text>
              <LoadingSpinner mode={mode} size={"small"} />
              Uploading...
            </Text>
          </View>
        )}
        {error && (
          <View>
            <Text style={{ color: theme.error, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        )}
        {success && (
          <View>
            <Text style={{ color: theme.success, textAlign: "center" }}>
              {success}
            </Text>
          </View>
        )}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.label, { color: theme.foreground }]}>
          PRICE PER SESSION *
        </Text>
        <View
          style={[
            styles.priceRow,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.currency,
              { color: theme.primary, borderColor: theme.primary },
            ]}
          >
            ETB
          </Text>
          <TextInput
            value={price}
            style={{
              width: 100,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: theme.border,
              backgroundColor: theme.input,
              fontSize: 18,
              paddingLeft: 20,
              color: theme.foreground,
            }}
            onChangeText={(value) => {
              setPrice(value);
            }}
          />
          <Text style={[styles.session, { color: theme.muted }]}>
            / 60-min session
          </Text>
        </View>
        <Text style={[styles.helper, { color: theme.muted }]}>
          Market Rate Presets
        </Text>
        <View style={styles.presets}>
          {presets.map((item) => (
            <Pressable
              key={item}
              onPress={() => setPrice(item)}
              style={[
                styles.preset,
                {
                  backgroundColor: price === item ? theme.primary : theme.input,
                  borderColor: price === item ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: price === item ? "#FFF" : theme.muted,
                  fontWeight: "700",
                }}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <View
          style={[
            styles.breakdown,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <View style={styles.breakdownRow}>
            <Text style={[styles.helper, { color: theme.muted }]}>
              Your Take-home (85%)
            </Text>
            <Text style={[styles.amount, { color: theme.success }]}>
              {takeHome} ETB
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.helper, { color: theme.muted }]}>
              Bole Network Operations (15%)
            </Text>
            <Text style={[styles.networkAmount, { color: theme.foreground }]}>
              {operations} ETB
            </Text>
          </View>
        </View>
      </Card>
      <View style={styles.buttonFlex}>
        <Button
          mode={mode}
          variant="outline"
          title="skip for now"
          disabled={loading}
          loading={loading}
          style={{ width: 150 }}
          onPress={async () => {
            await deleteProgress();
            onSkip();
          }}
        />
        <Button
          mode={mode}
          title="SUBMIT"
          loading={loading}
          disabled={uploading}
          onPress={() => url && onComplete?.({ price, photoUri: url })}
          style={{ width: 150 }}
        />
      </View>
      {loading ? (
        <LoadingSpinner mode={mode} />
      ) : (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            256-bit encrypted verification • Bole Elite Network • Addis Ababa
          </Text>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            Global English (EN-US)
          </Text>
          <Text style={[styles.footerText, { color: theme.subtle }]}>
            BOLE ELITE PARTNER NETWORK © 2025
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarMiniCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    position: "absolute",
    bottom: 2,
    right: 5,
    borderWidth: 1,
  },
  buttonFlex: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 5,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 34, lineHeight: 38 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    color: "#FFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
  },
  step: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heading: { gap: spacing.md },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontWeight: "800",
  },
  title: { fontSize: typography.title, fontWeight: "900" },
  card: { gap: spacing.md },
  label: { fontSize: typography.label, fontWeight: "900", letterSpacing: 0.5 },
  helper: { fontSize: typography.caption, lineHeight: 20 },
  photoBox: {
    minHeight: 186,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 82,
    height: 82,
    borderWidth: 1,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 52, lineHeight: 58 },
  upload: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontWeight: "700",
  },
  divider: { height: 1, marginVertical: spacing.md },
  priceRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  currency: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontWeight: "900",
  },
  priceInput: { flex: 1, marginBottom: 0 },
  priceInputText: { fontSize: 20, fontWeight: "800" },
  session: { fontSize: typography.caption },
  presets: { flexDirection: "row", gap: spacing.sm },
  preset: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  breakdown: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  amount: { fontSize: 18, fontWeight: "900" },
  networkAmount: { fontWeight: "800" },
  footer: { alignItems: "center", gap: spacing.sm, paddingBottom: spacing.md },
  footerText: { textAlign: "center", fontSize: typography.caption },
});
