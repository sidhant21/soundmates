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

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const trimmed = username.trim().toLowerCase();

    if (!trimmed || !password || !confirm) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (trimmed.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      Alert.alert("Error", "Username can only contain letters, numbers, and underscores");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(trimmed, password);
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message ?? "Something went wrong");
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
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Create your account</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Username */}
          <View>
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
              Letters, numbers, and underscores only · min 3 characters
            </Text>
          </View>

          {/* Password */}
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

          {/* Confirm Password */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inputNoPrefix, { color: colors.foreground }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.mutedForeground}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#9e8bff" }, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Switch to Login ── */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
            <Text style={{ color: "#9e8bff", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
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
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6, marginLeft: 4 },
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
