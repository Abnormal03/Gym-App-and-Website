import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, type ThemeMode } from "../../../src/constants/colors";
import { useTheme } from "../../../src/hooks/useTheme";
import { Button } from "../../../src/components/common/Button";
import { useAuth } from "../../../src/hooks/useAuthStore";

type Props = { mode?: ThemeMode; onLogin?: () => void; onToggleMode?: (mode: ThemeMode) => void };
export default function SignupScreen({ mode: providedMode, onLogin, onToggleMode }: Props) {
  const { mode: appMode, setMode: setAppMode } = useTheme();
  const mode = providedMode ?? appMode;
  const p = colors[mode];
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { handleRegister, loading, error } = useAuth();

  const goToLogin = onLogin ?? (() => router.replace("/(auth)/login"));
  const fields = [
    { label: "Full name", value: name, set: setName, icon: "person-outline", placeholder: "Your name" },
    { label: "Email address", value: email, set: setEmail, icon: "mail-outline", placeholder: "you@example.com", keyboardType: "email-address", autoCapitalize: "none" },
    { label: "Phone number", value: phone, set: setPhone, icon: "call-outline", placeholder: "+251 ...", keyboardType: "phone-pad" },
  ] as const;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.themeSwitch, { backgroundColor: p.card, borderColor: p.border }]}>
            {(["light", "dark"] as const).map((option) => <Pressable key={option} onPress={() => { void setAppMode(option); onToggleMode?.(option); }} style={[s.themeOption, mode === option && { backgroundColor: p.primary }]}>
              <Text style={{ color: mode === option ? "#fff" : p.foreground }}>{option === "light" ? "Light" : "Dark"}</Text>
            </Pressable>)}
          </View>
          <View style={s.brand}>
            <View style={[s.mark, { backgroundColor: p.primary }]}><MaterialCommunityIcons name="dumbbell" size={34} color="#fff" /></View>
            <Text style={[s.brandName, { color: p.foreground }]}>Bole Elite</Text>
            <Text style={[s.brandLocation, { color: p.muted }]}>ADDIS ABABA · ETHIOPIA</Text>
          </View>
          <Text style={[s.title, { color: p.foreground }]}>Create your account</Text>
          <Text style={[s.description, { color: p.muted }]}>Sign up to book sessions and track your training.</Text>

          {error && <View style={[s.errorBanner, { backgroundColor: mode === "dark" ? "#431C1A" : "#FDEBE9" }]} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={16} color={p.error} />
            <Text style={[s.error, { color: p.error }]}>{error}</Text>
          </View>}

          {fields.map((field) => <AuthField key={field.label} label={field.label} placeholder={field.placeholder} icon={field.icon} value={field.value} onChangeText={field.set} palette={p} invalid={!!error} keyboardType={"keyboardType" in field ? field.keyboardType : undefined} autoCapitalize={"autoCapitalize" in field ? field.autoCapitalize : undefined} />)}
          <AuthField label="Password" placeholder="Create a password" icon="lock-closed-outline" value={password} onChangeText={setPassword} palette={p} invalid={!!error} secureTextEntry={!show} right={<Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} onPress={() => setShow(!show)}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={p.muted} /></Pressable>} />

          <Pressable style={s.terms} onPress={() => setChecked(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
            <View style={[s.check, { borderColor: checked ? p.primary : p.border, backgroundColor: checked ? p.primary : "transparent" }]}>{checked && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
            <Text style={[s.termsText, { color: p.muted }]}>I agree to the <Text style={{ color: p.primary }}>Terms of Service</Text> and <Text style={{ color: p.primary }}>Privacy Policy.</Text></Text>
          </Pressable>
          <Button mode={mode} title="Create account" loading={loading} disabled={!checked} onPress={() => handleRegister({ name, email, phone: phone || undefined, password })} style={s.submit} textStyle={s.submitText} />
          <Text style={[s.switch, { color: p.muted }]}>Already have an account? <Text onPress={goToLogin} style={{ color: p.primary }}>Sign in</Text></Text>
          <Pressable accessibilityRole="button" style={[s.language, { backgroundColor: p.card, borderColor: p.border }]}><Ionicons name="globe-outline" size={14} color={p.foreground} /><Text style={{ color: p.foreground, fontSize: 13, fontWeight: "600" }}>Amharic · አማርኛ</Text><Ionicons name="chevron-down" size={13} color={p.muted} /></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthField({ label, placeholder, icon, value, onChangeText, palette, invalid, secureTextEntry, right, keyboardType, autoCapitalize }: any) {
  return <View style={s.fieldWrap}>
    {label ? <Text style={[s.label, { color: palette.foreground }]}>{label}</Text> : null}
    <View style={[s.field, { backgroundColor: palette.card, borderColor: invalid ? palette.error : "transparent" }]}>
      <Ionicons name={icon} size={17} color={palette.muted} />
      <TextInput accessibilityLabel={label || placeholder} placeholder={placeholder} placeholderTextColor={palette.muted} value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} style={[s.input, { color: palette.foreground }]} />
      {right}
    </View>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 460, alignSelf: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 },
  themeSwitch: { alignSelf: "flex-end", flexDirection: "row", borderRadius: 22, padding: 3, borderWidth: 1 },
  themeOption: { minWidth: 48, alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18 },
  brand: { alignItems: "center", marginTop: 6, marginBottom: 23 },
  mark: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  brandName: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }, brandLocation: { marginTop: 4, fontSize: 12, letterSpacing: 1.8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 }, description: { fontSize: 15, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, marginBottom: 16 }, error: { flex: 1, fontSize: 13, lineHeight: 19 },
  fieldWrap: { marginBottom: 13 }, label: { fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 6 },
  field: { height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15 }, input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  terms: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, marginBottom: 14 }, check: { width: 18, height: 18, borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" }, termsText: { flex: 1, fontSize: 13, lineHeight: 19 },
  submit: { minHeight: 52, height: 52, borderRadius: 14, shadowOpacity: 0, elevation: 0 }, submitText: { fontSize: 15, fontWeight: "700" },
  switch: { textAlign: "center", fontSize: 14, marginTop: 20 }, language: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 8, borderRadius: 24, paddingVertical: 11, paddingHorizontal: 16, marginTop: 21, borderWidth: 1 },
});
