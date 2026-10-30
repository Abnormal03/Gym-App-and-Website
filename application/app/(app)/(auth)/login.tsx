import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, type ThemeMode } from "../../../src/constants/colors";
import { useTheme } from "../../../src/hooks/useTheme";
import { useAuth } from "../../../src/hooks/useAuthStore";
import { Button } from "../../../src/components/common/Button";

type Props = { mode?: ThemeMode; onToggleMode?: (mode: ThemeMode) => void };

export default function LoginScreen({ mode: providedMode, onToggleMode }: Props) {
  const { mode: appMode, setMode: setAppMode } = useTheme();
  const mode = providedMode ?? appMode;
  const palette = colors[mode];
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { handleLogin, loading, error } = useAuth();
  const hasError = Boolean(error);

  const toggleMode = (nextMode: ThemeMode) => {
    void setAppMode(nextMode);
    onToggleMode?.(nextMode);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.themeSwitch, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {(["light", "dark"] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === option }}
                onPress={() => toggleMode(option)}
                style={[
                  styles.themeOption,
                  mode === option && { backgroundColor: palette.primary },
                ]}
              >
                <Text style={{ color: mode === option ? "#FFFFFF" : palette.foreground }}>
                  {option === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: palette.primary }]}>
              <MaterialCommunityIcons name="dumbbell" size={34} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandName, { color: palette.foreground }]}>Bole Elite</Text>
            <Text style={[styles.brandLocation, { color: palette.muted }]}>ADDIS ABABA · ETHIOPIA</Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { color: palette.foreground }]}>Welcome back</Text>
            <Text style={[styles.description, { color: palette.muted }]}>Sign in to book sessions and track your training.</Text>

            {hasError && (
            <View style={[styles.errorBanner, { backgroundColor: mode === "dark" ? "#431C1A" : "#FDEBE9" }]} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={16} color={palette.error} />
                <View style={styles.errorCopy}>
                  <Text style={[styles.errorTitle, { color: palette.error }]}>We couldn’t sign you in</Text>
                  <Text style={[styles.errorMessage, { color: palette.error }]}>Check your email or phone and password, then try again.</Text>
                </View>
              </View>
            )}

            <AuthField
              label="Email or phone"
              placeholder="example@bolefitness.com"
              icon="person-outline"
              value={email}
              onChangeText={setEmail}
              palette={palette}
              invalid={hasError}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordLabelRow}>
              <Text style={[styles.label, { color: palette.foreground }]}>Password</Text>
            </View>
            <AuthField
              label=""
              placeholder="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              palette={palette}
              invalid={hasError}
              secureTextEntry={!showPassword}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={palette.muted} />
                </Pressable>
              }
            />

            {hasError && (
              <View style={styles.fieldError} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={14} color={palette.error} />
                <Text style={[styles.fieldErrorText, { color: palette.error }]}>Incorrect email, phone or password</Text>
              </View>
            )}
            <Pressable accessibilityRole="button" style={styles.forgotPassword}>
              <Text style={[styles.link, { color: palette.primary }]}>Forgot password?</Text>
            </Pressable>

            <Button
              mode={mode}
              title="Sign in"
              loading={loading}
              onPress={() => handleLogin({ email, password })}
              style={styles.submit}
              textStyle={styles.submitText}
            />
          </View>

          <Text style={[styles.switchText, { color: palette.muted }]}>
            New to Bole Elite?{" "}
            <Text onPress={() => router.replace("/(auth)/Signup")} style={{ color: palette.primary }}>
              Create an account
            </Text>
          </Text>
          <Pressable accessibilityRole="button" style={[styles.language, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Ionicons name="globe-outline" size={14} color={palette.foreground} />
            <Text style={[styles.languageText, { color: palette.foreground }]}>Amharic · አማርኛ</Text>
            <Ionicons name="chevron-down" size={13} color={palette.muted} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthField({ label, placeholder, icon, value, onChangeText, palette, invalid, secureTextEntry, right, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text> : null}
      <View style={[
        styles.field,
        { backgroundColor: palette.card, borderColor: invalid ? palette.error : "transparent" },
      ]}>
        <Ionicons name={icon} size={17} color={palette.muted} />
        <TextInput
          accessibilityLabel={label || placeholder}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[styles.input, { color: palette.foreground }]}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 460, alignSelf: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 },
  themeSwitch: { alignSelf: "flex-end", flexDirection: "row", borderRadius: 22, padding: 3, borderWidth: 1 },
  themeOption: { minWidth: 48, alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18 },
  brand: { alignItems: "center", marginTop: 6, marginBottom: 35 },
  mark: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  brandName: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  brandLocation: { marginTop: 4, fontSize: 12, letterSpacing: 1.8 },
  form: { width: "100%" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 },
  description: { fontSize: 15, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, padding: 14, marginBottom: 16 },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  errorMessage: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 6 },
  field: { height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15 },
  input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  passwordLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  link: { fontSize: 13, fontWeight: "600" },
  forgotPassword: { alignSelf: "flex-end", marginTop: -9, marginBottom: 6 },
  fieldError: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -7, marginBottom: 14, paddingHorizontal: 2 },
  fieldErrorText: { fontSize: 13, lineHeight: 18 },
  submit: { minHeight: 52, height: 52, borderRadius: 14, marginTop: 7, shadowOpacity: 0, elevation: 0 },
  submitText: { fontSize: 15, fontWeight: "700" },
  switchText: { fontSize: 14, textAlign: "center", marginTop: 21 },
  language: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 8, borderRadius: 24, paddingVertical: 11, paddingHorizontal: 16, marginTop: 21, borderWidth: 1 },
  languageText: { fontSize: 13, fontWeight: "600" },
});
