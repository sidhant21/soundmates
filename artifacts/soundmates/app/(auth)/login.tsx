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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (e: any) {
      // Give a friendlier message for wrong credentials
      const msg = e.code === "auth/invalid-credential" || e.code === "auth/wrong-password"
        ? "Incorrect username or password."
        : e.message ?? "Something went wrong";
      Alert.alert("Login failed", msg);
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

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: "#9e8bff" }]}>SoundMates</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            See what your friends are listening to
          </Text>
        </View>

        {/* ── Form ── */}
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
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputNoPrefix, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#9e8bff" }, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Switch to Sign Up ── */}
        <TouchableOpacity onPress={() => router.push("/(auth)/signup")} activeOpacity={0.7}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            No account?{" "}
            <Text style={{ color: "#9e8bff", fontFamily: "Inter_600SemiBold" }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  header: { gap: 8, alignItems: "center" },
  logo: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 14 },
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
  inputNoPrefix: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
  switchText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
});
