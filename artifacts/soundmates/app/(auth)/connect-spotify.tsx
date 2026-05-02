import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSpotify } from "@/context/SpotifyContext";

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
const SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-read-currently-playing",
].join(" ");

export default function ConnectSpotifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateSpotifyTokens, logOut } = useAuth();
  const { fetchAllSpotifyData } = useSpotify();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "soundmates" });

  const handleConnect = async () => {
    setLoading(true);
    try {
      const authUrl =
        `https://accounts.spotify.com/authorize` +
        `?client_id=${SPOTIFY_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(SCOPES)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== "success") {
        setLoading(false);
        return;
      }

      const url = result.url;
      const code = new URL(url).searchParams.get("code");
      if (!code) {
        Alert.alert("Error", "No authorization code received from Spotify");
        setLoading(false);
        return;
      }

      // Exchange code for tokens via our API server
      const tokenRes = await fetch(`/api/spotify/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to exchange Spotify token");
      }

      const { access_token, refresh_token, expires_in } = await tokenRes.json();
      await updateSpotifyTokens(access_token, refresh_token, expires_in);
      await fetchAllSpotifyData(access_token);
    } catch (e: any) {
      Alert.alert("Spotify connection failed", e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: "#1DB954" }]}>
          <Feather name="music" size={42} color="#000" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Connect Spotify</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Link your Spotify account to showcase your music taste and see what your friends are listening to.
        </Text>

        <View style={styles.permissions}>
          {[
            { icon: "trending-up", label: "Your top tracks and artists" },
            { icon: "clock", label: "Your recently played songs" },
            { icon: "headphones", label: "Your currently playing song" },
          ].map((p) => (
            <View key={p.label} style={styles.permRow}>
              <Feather name={p.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.permText, { color: colors.foreground }]}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#1DB954" }, loading && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name="link" size={18} color="#000" />
              <Text style={styles.btnText}>Connect with Spotify</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={logOut} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
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
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
