import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSpotify } from "@/context/SpotifyContext";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { TrackRow } from "@/components/TrackRow";
import { ArtistRow } from "@/components/ArtistRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logOut } = useAuth();
  const {
    topTracks,
    topArtists,
    currentlyPlaying,
    recentlyPlayed,
    loadingTracks,
    loadingArtists,
    fetchAllSpotifyData,
  } = useSpotify();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (profile?.spotifyConnected) fetchAllSpotifyData();
  }, [profile?.spotifyConnected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllSpotifyData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.username, { color: colors.foreground }]}>@{profile?.username}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={logOut}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Spotify badge */}
      {profile?.spotifyConnected && (
        <View style={[styles.spotifyBadge, { backgroundColor: "#1DB95420", borderColor: "#1DB954" }]}>
          <Feather name="music" size={14} color="#1DB954" />
          <Text style={styles.spotifyBadgeText}>Spotify Connected</Text>
        </View>
      )}

      {/* Now Playing */}
      {currentlyPlaying?.item && (
        <View style={styles.section}>
          <NowPlayingBar currentlyPlaying={currentlyPlaying} />
        </View>
      )}

      {/* Top Tracks */}
      <View style={styles.section}>
        <SectionHeader title="Top Tracks" subtitle="Last 4 weeks" />
        {loadingTracks ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : topTracks.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No data yet</Text>
        ) : (
          topTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} showIndex />
          ))
        )}
      </View>

      {/* Top Artists */}
      <View style={styles.section}>
        <SectionHeader title="Top Artists" subtitle="Last 4 weeks" />
        {loadingArtists ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : topArtists.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No data yet</Text>
        ) : (
          topArtists.map((artist, i) => (
            <ArtistRow key={artist.id} artist={artist} index={i} showIndex />
          ))
        )}
      </View>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recently Played" />
          {recentlyPlayed.slice(0, 6).map((item, i) => (
            <TrackRow key={`${item.track.id}-${i}`} track={item.track} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 4 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  username: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  email: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
  spotifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  spotifyBadgeText: { color: "#1DB954", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  section: { marginBottom: 28 },
  loader: { marginVertical: 16 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
});
