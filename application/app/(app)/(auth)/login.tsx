import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, type ThemeMode } from "../../../src/constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../../src/hooks/useTheme";
import { useAuth } from "../../../src/hooks/useAuthStore";
import { Button } from "../../../src/components/common/Button";

type Props = {
  mode?: ThemeMode;
  onToggleMode?: (mode: ThemeMode) => void;
};

function LoginScreen({ mode: providedMode, onToggleMode }: Props) {
  const { mode: appMode, setMode: setAppMode } = useTheme();
  const mode = providedMode ?? appMode;
  const palette = colors[mode];
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { handleLogin, loading, error } = useAuth();

  const toggleMode = (nextMode: ThemeMode) => {
    void setAppMode(nextMode);
    onToggleMode?.(nextMode);
  };

  const onSignup = () => {
    router.replace("/(auth)/Signup");
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={s.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.toggle}>
          <Pressable
            onPress={() => toggleMode("light")}
            style={[
              s.toggleButton,
              mode === "light" && { backgroundColor: palette.primary + "22" },
            ]}
          >
            <Text style={[s.toggleText, { color: palette.foreground }]}>
              Light
            </Text>
          </Pressable>
          <Pressable
            onPress={() => toggleMode("dark")}
            style={[
              s.toggleButton,
              mode === "dark" && { backgroundColor: palette.primary + "22" },
            ]}
          >
            <Text style={[s.toggleText, { color: palette.foreground }]}>
              Dark
            </Text>
          </Pressable>
        </View>
        <View style={s.brand}>
          <View style={[s.mark, { backgroundColor: palette.primary }]}>
            <MaterialCommunityIcons name="dumbbell" size={36} color="#fff" />
          </View>
          <Text style={[s.brandName, { color: palette.foreground }]}>
            BOLE ELITE
          </Text>
          <Text style={[s.subtitle, { color: palette.muted }]}>ADDIS ABABA • ETHIOPIA</Text>
        </View>
        <View
          style={[
            s.card,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <Text style={[s.title, { color: palette.foreground }]}>
            Welcome Back, Beast
          </Text>
          <Text style={[s.description, { color: palette.muted }]}>Elevate your performance today.</Text>
          <Field
            label="EMAIL OR PHONE"
            placeholder="example@bolefitness.com"
            palette={palette}
            icon="person-outline"
            value={email}
            onChangeText={setEmail}
          />
          <View style={s.passwordRow}>
            <Text style={[s.label, { color: palette.muted }]}>PASSWORD</Text>
            <Pressable>
              <Text
                style={[
                  s.link,
                  {
                    color: mode === "dark" ? palette.success : palette.primary,
                  },
                ]}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </View>
          <Field
            label=""
            placeholder="••••••••"
            palette={palette}
            icon="lock-closed-outline"
            secure={!show}
            value={password}
            onChangeText={setPassword}
            right={
              <Pressable onPress={() => setShow(!show)}>
                <Ionicons
                  name={show ? "eye-off-outline" : "eye-outline"}
                  size={25}
                  color={palette.muted}
                />
              </Pressable>
            }
          />
          {error && (
            <Text style={[s.error, { color: palette.error }]}>{error}</Text>
          )}
          <Button
            mode={mode}
            title="LOGIN ϟ"
            loading={loading}
            onPress={() => handleLogin({ email, password })}
          />
          <Text style={[s.divider, { color: palette.muted }]}>───── OR CONTINUE WITH ─────</Text>
          <View style={s.social}>
            <Social label="Google" palette={palette} />
            <Social label="Apple" palette={palette} apple />
          </View>
        </View>
        <Text style={[s.switch, { color: palette.muted }]}>
          Don&apos;t have an account?{" "}
          <Text
            onPress={onSignup}
            style={{
              color: mode === "dark" ? palette.success : palette.primary,
            }}
          >
            Sign Up
          </Text>
        </Text>
        <Pressable style={[s.language, { borderColor: palette.border }]}>
          <Ionicons name="globe-outline" size={17} color={palette.muted} />
          <Text style={{ color: palette.muted }}>AMHARIC / አማርኛ</Text>
          <Ionicons name="chevron-down" size={15} color={palette.muted} />
        </Pressable>
        <Text style={[s.footer, { color: palette.muted }]}>BOLE ELITE FITNESS • ADDIS ABABA</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Field({
  label,
  placeholder,
  palette,
  icon,
  secure,
  right,
  value,
  onChangeText,
}: any) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.label, { color: palette.muted }]}>{label}</Text>
      <View
        style={[
          s.field,
          { backgroundColor: palette.input, borderColor: palette.border },
        ]}
      >
        <Ionicons name={icon} size={25} color={palette.muted} />
        <TextInput
          accessibilityLabel={label || "Password"}
          placeholder={placeholder}
          placeholderTextColor={palette.muted + "99"}
          secureTextEntry={secure}
          value={value}
          onChangeText={onChangeText}
          style={[s.input, { color: palette.foreground }]}
        />
        {right}
      </View>
    </View>
  );
}
function Social({ label, palette, apple }: any) {
  return (
    <Pressable style={[s.socialButton, { borderColor: palette.border }]}>
      <Ionicons
        name={apple ? "logo-apple" : "logo-google"}
        size={22}
        color={palette.foreground}
      />
      <Text style={{ color: palette.foreground, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1 },
  keyboardAvoiding: { flex: 1, width: "100%" },
  content: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 28,
    minHeight: "100%",
  },
  toggle: {
    alignSelf: "flex-end",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#69708055",
    borderRadius: 20,
    padding: 3,
  },
  toggleButton: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16 },
  toggleText: { fontSize: 12 },
  brand: { alignItems: "center", marginTop: 8, marginBottom: 36 },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  brandName: { fontSize: 52, fontWeight: "900", letterSpacing: -3 },
  subtitle: {
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 12,
    fontSize: 13,
  },
  card: {
    width: "100%",
    maxWidth: 510,
    borderWidth: 1,
    borderRadius: 17,
    padding: 36,
  },
  title: { fontSize: 29, fontWeight: "700" },
  description: {
    fontSize: 19,
    marginTop: 9,
    marginBottom: 30,
  },
  fieldWrap: { marginBottom: 22 },
  label: {
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 15,
    marginBottom: 8,
  },
  field: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 17,
  },
  input: { flex: 1, fontSize: 20 },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: { fontSize: 17 },
  primary: {
    minHeight: 76,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  primaryText: { color: "#fff", fontSize: 23, fontWeight: "800" },
  error: { fontSize: 16, marginBottom: 14, textAlign: "center" },
  divider: {
    textAlign: "center",
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 1,
    marginVertical: 28,
  },
  social: { flexDirection: "row", gap: 18 },
  socialButton: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  switch: { fontSize: 19, marginTop: 27 },
  language: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 19,
    marginTop: 28,
  },
  footer: {
    fontFamily: "monospace",
    letterSpacing: 2,
    fontSize: 11,
    marginTop: "auto",
    paddingTop: 28,
  },
});

export default LoginScreen;
