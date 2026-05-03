import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSpotify } from "@/context/SpotifyContext";
import {
  generatePKCEPair,
  buildAuthUrl,
  exchangeCodeForTokens,
  getRedirectUri,
} from "@/lib/spotify";

WebBrowser.maybeCompleteAuthSession();

// Store verifier in memory (survives a redirect on web via sessionStorage)
const VERIFIER_KEY = "spotify_pkce_verifier";

function saveVerifier(v: string) {
  if (Platform.OS === "web") sessionStorage.setItem(VERIFIER_KEY, v);
}
function loadVerifier(): string | null {
  if (Platform.OS === "web") return sessionStorage.getItem(VERIFIER_KEY);
  return null;
}
function clearVerifier() {
  if (Platform.OS === "web") sessionStorage.removeItem(VERIFIER_KEY);
}
function buildRedirectUri(): string {
  if (Platform.OS === "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}/`;
    return window.location.origin + "/";
  }
  return AuthSession.makeRedirectUri({ scheme: "soundmates", path: "callback" });
}
export default function ConnectSpotifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateSpotifyTokens, logOut } = useAuth();
  const { fetchAllSpotifyData } = useSpotify();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const redirectUri = buildRedirectUri();
  // ── On web: handle the redirect back from Spotify ───────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      Alert.alert("Spotify Error", `Authorization denied: ${error}`);
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!code) return;

    // We got a code back from Spotify — exchange it
    const verifier = loadVerifier();
    if (!verifier) {
      Alert.alert("Error", "PKCE verifier missing. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // Clean the URL immediately so reloads don't re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    (async () => {
      setLoading(true);
      setStatusMsg("Connecting to Spotify…");
      try {
        const { access_token, refresh_token, expires_in } =
          await exchangeCodeForTokens(code, verifier);
        clearVerifier();

        setStatusMsg("Saving tokens…");
        await updateSpotifyTokens(access_token, refresh_token, expires_in);

        setStatusMsg("Loading your music…");
        await fetchAllSpotifyData(access_token);
      } catch (e: any) {
        Alert.alert("Spotify connection failed", e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
        setStatusMsg("");
      }
    })();
  }, []);

  // ── Connect button handler ───────────────────────────────────────────────────
  const handleConnect = async () => {
    setLoading(true);
    try {
      const { verifier, challenge } = await generatePKCEPair();

      if (Platform.OS === "web") {
        // Save verifier before redirect
        saveVerifier(verifier);
        const authUrl = buildAuthUrl(challenge);
        window.location.href = authUrl;
        // Page will redirect, so nothing after this runs
        return;
      }

      // ── Native (Expo Go / standalone): use WebBrowser ────────────────────────
      const authUrl = buildAuthUrl(challenge);
      const redirectUri = getRedirectUri();
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== "success") {
        setLoading(false);
        return;
      }

      const resultUrl = new URL(result.url);
      const code = resultUrl.searchParams.get("code");
      if (!code) {
        Alert.alert("Error", "No authorization code received from Spotify");
        setLoading(false);
        return;
      }

      const { access_token, refresh_token, expires_in } =
        await exchangeCodeForTokens(code, verifier);
      await updateSpotifyTokens(access_token, refresh_token, expires_in);
      await fetchAllSpotifyData(access_token);
    } catch (e: any) {
      Alert.alert("Spotify connection failed", e.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: "#1DB954" }]}>
          {loading ? (
            <ActivityIndicator color="#000" size="large" />
          ) : (
            <Feather name="music" size={42} color="#000" />
          )}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {loading ? "Connecting…" : "Connect Spotify"}
        </Text>
        {loading && statusMsg ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {statusMsg}
          </Text>
        ) : (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Link your Spotify account to showcase your music taste and see what
            your friends are listening to.
          </Text>
        )}
        <View style={[styles.redirectBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.redirectLabel, { color: colors.mutedForeground }]}>
            Add this Redirect URI in your Spotify Dashboard:
          </Text>
          <Text selectable style={[styles.redirectUri, { color: colors.primary }]}>
            {redirectUri}
          </Text>
        </View>

        {!loading && (
          <View style={styles.permissions}>
            {[
              { icon: "trending-up", label: "Your top tracks and artists" },
              { icon: "clock", label: "Your recently played songs" },
              { icon: "headphones", label: "Your currently playing song" },
            ].map((p) => (
              <View key={p.label} style={styles.permRow}>
                <Feather name={p.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.permText, { color: colors.foreground }]}>
                  {p.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {!loading && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#1DB954" }]}
            onPress={handleConnect}
            activeOpacity={0.85}
          >
            <Feather name="link" size={18} color="#000" />
            <Text style={styles.btnText}>Connect with Spotify</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={logOut} activeOpacity={0.7} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Sign out
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28 },
  content: { flex: 1, justifyContent: "center", gap: 20, alignItems: "center" },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  permissions: { gap: 14, alignSelf: "stretch", marginTop: 8 },
  permRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  permText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  actions: { gap: 12 },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  redirectBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    alignSelf: "stretch",
  },
  redirectLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  redirectUri: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
});
