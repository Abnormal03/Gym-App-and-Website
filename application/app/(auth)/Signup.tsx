import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, type ThemeMode } from "../../src/constants/colors";
import { useRouter } from "expo-router";
import { useAuthTheme } from "./_layout";
import { Button } from "../../src/components/common/Button";
import { Input } from "../../src/components/common/Input";
import { useAuth } from "../../src/hooks/useAuthStore";

type Props = {
  mode?: ThemeMode;
  onLogin?: () => void;
  onToggleMode?: (mode: ThemeMode) => void;
};
function SignupScreen({ mode: providedMode, onLogin, onToggleMode }: Props) {
  const authTheme = useAuthTheme();
  const mode = providedMode ?? authTheme.mode;
  const p = colors[mode];
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { handleRegister, loading, error } = useAuth();

  const toggleMode = (nextMode: ThemeMode) => {
    authTheme.setMode(nextMode);
    onToggleMode?.(nextMode);
  };

  const goToLogin = onLogin ?? (() => router.replace("/(auth)/login"));

  const field = (
    label: string,
    placeholder: string,
    icon: any,
    secure?: boolean,
    right?: any,
  ) => (
    <View style={x.wrap}>
      <Text style={x.label}>{label}</Text>
      <View
        style={[x.field, { backgroundColor: p.input, borderColor: p.border }]}
      >
        <Ionicons name={icon} size={25} color={p.muted} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={p.muted + "99"}
          secureTextEntry={secure}
          style={[x.input, { color: p.foreground }]}
        />
        {right}
      </View>
    </View>
  );
  return (
    <SafeAreaView style={[x.safe, { backgroundColor: p.background }]}>
      <ScrollView
        contentContainerStyle={x.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={x.toggle}>
          <Pressable
            onPress={() => toggleMode("light")}
            style={[
              x.toggleButton,
              mode === "light" && { backgroundColor: p.primary + "22" },
            ]}
          >
            <Text style={{ color: p.foreground }}>Light</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleMode("dark")}
            style={[
              x.toggleButton,
              mode === "dark" && { backgroundColor: p.primary + "22" },
            ]}
          >
            <Text style={{ color: p.foreground }}>Dark</Text>
          </Pressable>
        </View>
        <View style={x.brand}>
          <Text style={[x.brandName, { color: p.primary }]}>BOLE ELITE</Text>
          <Text style={x.subtitle}>BEAST MODE: ACTIVATED</Text>
        </View>
        <View
          style={[x.card, { backgroundColor: p.card, borderColor: p.border }]}
        >
          <Input
            mode={mode}
            label="FULL NAME"
            placeholder="e.g. Abebe Bikila"
            value={name}
            onChangeText={setName}
            icon={<Ionicons name="person-outline" size={25} color={p.muted} />}
          />
          <Input
            mode={mode}
            label="EMAIL ADDRESS"
            placeholder="champion@bole.fit"
            value={email}
            onChangeText={setEmail}
            icon={<Ionicons name="mail-outline" size={25} color={p.muted} />}
          />
          <Input
            mode={mode}
            label="PHONE NUMBER"
            placeholder="+251 ..."
            value={phone}
            onChangeText={setPhone}
            icon={<Ionicons name="call-outline" size={25} color={p.muted} />}
          />
          <Input
            mode={mode}
            label="PASSWORD"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            icon={
              <Ionicons name="lock-closed-outline" size={25} color={p.muted} />
            }
            right={
              <Ionicons
                onPress={() => setShow(!show)}
                name={show ? "eye-off-outline" : "eye-outline"}
                size={25}
                color={p.muted}
              />
            }
          />
          <Pressable style={x.terms} onPress={() => setChecked(!checked)}>
            <View
              style={[
                x.check,
                { borderColor: p.muted },
                checked && {
                  backgroundColor: p.primary,
                  borderColor: p.primary,
                },
              ]}
            >
              {checked && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
            <Text style={[x.termsText, { color: p.muted }]}>
              I agree to the{" "}
              <Text style={{ color: p.primary }}>Terms of Service</Text> and{" "}
              <Text style={{ color: p.primary }}>Privacy Policy.</Text>
            </Text>
          </Pressable>
          {error && (
            <Text style={[x.error, { color: p.primary }]}>{error}</Text>
          )}
          <Button
            mode={mode}
            title="CREATE ACCOUNT ϟ"
            loading={loading}
            disabled={!checked}
            onPress={() =>
              handleRegister({
                name,
                email,
                phone: phone || undefined,
                password,
              })
            }
          />
          <View style={x.rule} />
          <Text style={[x.switch, { color: p.muted }]}>
            Already have an account?{" "}
            <Text
              onPress={goToLogin}
              style={{ color: mode === "dark" ? p.success : p.primary }}
            >
              Login
            </Text>
          </Text>
        </View>
        <Pressable style={[x.language, { borderColor: p.border }]}>
          <Ionicons name="globe-outline" size={17} color={p.muted} />
          <Text style={{ color: p.muted }}>AMHARIC / አማርኛ</Text>
          <Ionicons name="chevron-down" size={15} color={p.muted} />
        </Pressable>
        <Text style={x.footer}>BOLE ELITE FITNESS • ADDIS ABABA</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const x = StyleSheet.create({
  safe: { flex: 1 },
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
  brand: { alignItems: "center", marginTop: 46, marginBottom: 42 },
  brandName: { fontSize: 54, fontWeight: "900", letterSpacing: -3 },
  subtitle: {
    color: "#73768a",
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 14,
    fontSize: 13,
  },
  card: {
    width: "100%",
    maxWidth: 510,
    borderWidth: 1,
    borderRadius: 17,
    padding: 36,
  },
  wrap: { marginBottom: 22 },
  label: {
    color: "#777b91",
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
  error: { fontSize: 16, marginBottom: 14 },
  terms: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 30,
  },
  check: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: { flex: 1, fontSize: 18, lineHeight: 27 },
  primary: {
    minHeight: 76,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 21, fontWeight: "800" },
  rule: { height: 1, backgroundColor: "#777b9133", marginVertical: 28 },
  switch: { textAlign: "center", fontSize: 19 },
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
    color: "#73768a",
    fontFamily: "monospace",
    letterSpacing: 2,
    fontSize: 11,
    marginTop: "auto",
    paddingTop: 28,
  },
});

export default SignupScreen;
