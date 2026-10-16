import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/common/ScreenHeader";
import { useChatbot } from "../../src/hooks/useChatbot";
import { ChatLocale } from "../../src/services/chatbot.service";
import { useTheme } from "../../src/hooks/useTheme";

export default function ChatbotScreen() {
  const { theme } = useTheme();
  const { messages, loading, error, sendMessage } = useChatbot();
  const [locale, setLocale] = useState<ChatLocale>("en");
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const submit = async (suggestedQuestion?: string) => {
    const originalText = text;
    const message = suggestedQuestion?.trim() || text.trim();
    if (!message || loading) return;
    setText("");
    const sent = await sendMessage(message, locale);
    if (!sent && suggestedQuestion === undefined) {
      setText(originalText);
    }
    listRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScreenHeader title="Gym Support" />
        <View style={styles.localeRow}>
          {(["en", "am"] as const).map((item) => {
            const selected = locale === item;
            return (
              <TouchableOpacity
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setLocale(item)}
                style={[
                  styles.locale,
                  {
                    backgroundColor: selected ? theme.primary : theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : theme.foreground,
                    fontWeight: "600",
                  }}
                >
                  {item === "en" ? "English" : "አማርኛ"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.suggestions}>
              <Text style={[styles.empty, { color: theme.muted }]}>
                {locale === "en"
                  ? "Ask about bookings, gyms, payments, or fitness. Choose a question to get started:"
                  : "ማንኛዉን ስለ ጂም፣ ክፍያ ወይም ልምምድ ጥያቄ ይተይቁ። ለመጀመር ከተተቀሱት መተየቅ ይችላሉ፡"}
              </Text>
              {(locale === "am"
                ? [
                    "የጂም ቦታ እንዴት ልያዝ?",
                    "አሰልጣኝ ወይም ፊዚዮቴራፒስት እንዴት ልጨምር?",
                    "የቦታ ማረጋገጫ QR ኮዴን የት አገኛለሁ?",
                    "የምግብ ምክር ማማከር እንዴት ልያዝ?",
                    "ለጀማሪ ቀላል የእንቅስቃሴ እቅድ ምክር ስጠኝ።",
                  ]
                : [
                    "How do I book a gym visit?",
                    "How do I add a trainer or physiotherapist?",
                    "Where can I find my booking QR code and details?",
                    "How do I book a nutrition consultation?",
                    "Can you suggest a simple beginner workout?",
                  ]
              ).map((question) => (
                <TouchableOpacity
                  key={question}
                  accessibilityRole="button"
                  onPress={() => void submit(question)}
                  disabled={loading}
                  style={[
                    styles.suggestion,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[styles.suggestionText, { color: theme.foreground }]}
                  >
                    {question}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          renderItem={({ item }) => {
            const fromUser = item.role === "user";
            return (
              <View
                style={[
                  styles.message,
                  {
                    alignSelf: fromUser ? "flex-end" : "flex-start",
                    backgroundColor: fromUser ? theme.primary : theme.card,
                    borderColor: fromUser ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: fromUser ? "#FFFFFF" : theme.foreground,
                    lineHeight: 21,
                  }}
                >
                  {item.content}
                </Text>
                {item.fallback && (
                  <Text style={[styles.fallback, { color: theme.muted }]}>
                    Automated fallback response
                  </Text>
                )}
              </View>
            );
          }}
        />
        {error && (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        )}
        <View
          style={[
            styles.composer,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <TextInput
            accessibilityLabel="Type your message"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void submit()}
            placeholder="Type a message..."
            placeholderTextColor={theme.muted}
            returnKeyType="send"
            editable={!loading}
            style={[styles.input, { color: theme.foreground }]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={() => void submit()}
            disabled={loading || !text.trim()}
            style={[
              styles.send,
              { backgroundColor: theme.primary },
              (loading || !text.trim()) && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  localeRow: { flexDirection: "row", gap: 10, padding: 16 },
  locale: {
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  messages: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  suggestions: { paddingTop: 28, gap: 10 },
  empty: { textAlign: "center", marginBottom: 8, lineHeight: 22 },
  suggestion: { borderWidth: 1, borderRadius: 14, padding: 12 },
  suggestionText: { lineHeight: 20, fontWeight: "500" },
  message: { maxWidth: "85%", borderWidth: 1, borderRadius: 16, padding: 12 },
  fallback: { fontSize: 11, marginTop: 8 },
  error: { marginHorizontal: 16, marginBottom: 8 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    margin: 12,
  },
  input: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
  send: {
    minWidth: 64,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sendText: { color: "#FFFFFF", fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
