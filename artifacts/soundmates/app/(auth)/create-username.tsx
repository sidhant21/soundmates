import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function CreateUsernameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createUsername } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    if (trimmed.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      Alert.alert("Error", "Username can only contain letters, numbers, and underscores");
      return;
    }
    setLoading(true);
    try {
      await createUsername(trimmed);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Choose a Username</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            This is how your friends will find you. You can't change it later.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Text style={[styles.at, { color: colors.mutedForeground }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="username"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Letters, numbers, and underscores only
          </Text>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        <View />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  header: { gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  form: { gap: 10 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  at: { fontSize: 16, fontFamily: "Inter_500Medium", marginRight: 4 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
