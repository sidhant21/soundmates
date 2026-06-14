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
import { useLastfm } from "@/context/LastfmContext";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { TrackRow } from "@/components/TrackRow";
import { ArtistRow } from "@/components/ArtistRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logOut, disconnectLastfm } = useAuth();
  const {
    topTracks,
    topArtists,
    currentlyPlaying,
    recentlyPlayed,
    loadingTracks,
    loadingArtists,
    fetchAllData,
    clearData,
  } = useLastfm();


  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (profile?.lastfmUsername) fetchAllData();
  }, [profile?.lastfmUsername]);



  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 160 },
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

      {/* Last.fm badge & disconnect */}
      {profile?.lastfmUsername && (
        <View style={styles.spotifyContainer}>
          <View style={[styles.spotifyBadge, { backgroundColor: "#D5100720", borderColor: "#D51007" }]}>
            <Feather name="music" size={14} color="#D51007" />
            <Text style={[styles.spotifyBadgeText, { color: "#D51007" }]}>Last.fm: {profile.lastfmUsername}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.disconnectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
               await disconnectLastfm();
               clearData();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.disconnectText, { color: colors.foreground }]}>Disconnect Last.fm</Text>
          </TouchableOpacity>
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
        <SectionHeader title="Top Tracks" subtitle="Last 7 days" />
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
        <SectionHeader title="Top Artists" subtitle="Last 7 days" />
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
          {(() => {
            const seen = new Map<string, { track: typeof recentlyPlayed[0]["track"]; count: number }>();
            for (const item of recentlyPlayed) {
              const existing = seen.get(item.track.id);
              if (existing) {
                existing.count += 1;
              } else {
                seen.set(item.track.id, { track: item.track, count: 1 });
              }
            }
            return Array.from(seen.values())
              .slice(0, 10)
              .map(({ track, count }) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  countLabel={count > 1 ? `Played ${count}×` : undefined}
                />
              ));
          })()}
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
  spotifyContainer: { marginBottom: 20, gap: 12 },
  spotifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  spotifyBadgeText: { color: "#1DB954", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  disconnectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  disconnectText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { marginBottom: 28 },
  loader: { marginVertical: 16 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
});
