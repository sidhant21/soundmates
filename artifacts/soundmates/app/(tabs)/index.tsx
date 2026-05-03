import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSpotify } from "@/context/SpotifyContext";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { TrackRow } from "@/components/TrackRow";
import { ArtistRow } from "@/components/ArtistRow";
import { SectionHeader } from "@/components/SectionHeader";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const {
    currentlyPlaying,
    topTracks,
    topArtists,
    recentlyPlayed,
    loadingTracks,
    loadingArtists,
    loadingCurrent,
    fetchAllSpotifyData,
  } = useSpotify();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (profile?.spotifyConnected) {
      fetchAllSpotifyData();
    }
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
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 100,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[styles.greeting, { color: colors.foreground }]}>
        Hey, <Text style={{ color: colors.primary }}>@{profile?.username}</Text>
      </Text>

      {/* Now Playing */}
      {!loadingCurrent && currentlyPlaying?.item && (
        <View style={styles.section}>
          <NowPlayingBar currentlyPlaying={currentlyPlaying} />
        </View>
      )}
      {loadingCurrent && (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      )}

      {/* Top Tracks */}
      <View style={styles.section}>
        <SectionHeader title="Your Top Tracks" subtitle="Last 4 weeks" />
        {loadingTracks ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : topTracks.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No top tracks yet</Text>
        ) : (
          topTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} showIndex />
          ))
        )}
      </View>

      {/* Top Artists */}
      <View style={styles.section}>
        <SectionHeader title="Your Top Artists" subtitle="Last 4 weeks" />
        {loadingArtists ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : topArtists.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No top artists yet</Text>
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
              .slice(0, 8)
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
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 16, letterSpacing: -0.3 },
  section: { marginBottom: 28 },
  loader: { marginVertical: 16 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
});
