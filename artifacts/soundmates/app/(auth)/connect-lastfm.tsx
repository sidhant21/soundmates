import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { verifyLastfmUser } from "@/lib/lastfm";

export default function ConnectLastfmScreen() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateLastfmUsername } = useAuth();

  const handleConnect = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter your Last.fm username");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError("");

    try {
      const exists = await verifyLastfmUser(trimmed);
      if (!exists) {
        setError("User not found on Last.fm. Please check the username.");
        return;
      }
      
      await updateLastfmUsername(trimmed);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Failed to connect Last.fm");
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="music" size={32} color="#D51007" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Connect to Last.fm</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We use Last.fm to bypass Spotify's strict public app limits. It's free and takes 2 minutes!
          </Text>
        </View>

        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Create Last.fm Account</Text>
              <TouchableOpacity onPress={() => openLink("https://www.last.fm/join")}>
                <Text style={[styles.stepLink, { color: colors.primary }]}>Click here to sign up →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Link your Spotify</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                In Last.fm Settings, connect "Spotify Scrobbling" so it can track your music.
              </Text>
              <TouchableOpacity onPress={() => openLink("https://www.last.fm/settings/applications")}>
                <Text style={[styles.stepLink, { color: colors.primary }]}>Link Spotify here →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Enter your Username</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}
                  placeholder="Last.fm username"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                  }}
                  onSubmitEditing={handleConnect}
                />
                {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleConnect}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnText}>Finish Connection</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D5100720",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 10, lineHeight: 20 },
  
  stepsContainer: { gap: 24, marginBottom: 40 },
  step: { flexDirection: "row", gap: 16 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepNumberText: { color: "#000", fontSize: 14, fontFamily: "Inter_700Bold" },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 6 },
  stepLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  inputContainer: { marginTop: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  error: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 6, marginLeft: 2 },
  btn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#000", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
