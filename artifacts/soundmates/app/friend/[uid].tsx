import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  getUserProfile,
  checkFriendship,
  getPendingRequestBetween,
  sendFriendRequest,
  declineOrCancelRequest,
  removeFriend,
  type UserProfile,
  type FriendRequest,
} from "@/lib/friends";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { TrackRow } from "@/components/TrackRow";
import { ArtistRow } from "@/components/ArtistRow";
import { SectionHeader } from "@/components/SectionHeader";
import type { SpotifyTrack, SpotifyArtist, CurrentlyPlaying, RecentlyPlayed } from "@/context/SpotifyContext";

async function fetchSpotifyData(token: string, endpoint: string) {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) return null;
  return res.json();
}

export default function FriendProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile: myProfile } = useAuth();
  const navigation = useNavigation();

  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [relation, setRelation] = useState<"none" | "friends" | "sent" | "received">("none");
  const [pendingReq, setPendingReq] = useState<FriendRequest | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!uid || !user) return;
    setLoadingProfile(true);
    try {
      const [fp, isFriend, pending] = await Promise.all([
        getUserProfile(uid),
        checkFriendship(user.uid, uid),
        getPendingRequestBetween(user.uid, uid),
      ]);
      setFriendProfile(fp);
      setPendingReq(pending);
      if (isFriend) setRelation("friends");
      else if (pending?.fromUid === user.uid) setRelation("sent");
      else if (pending?.toUid === user.uid) setRelation("received");
      else setRelation("none");

      if (fp?.spotifyConnected && fp.spotifyAccessToken) {
        loadSpotifyData(fp.spotifyAccessToken);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [uid, user]);

  const loadSpotifyData = async (token: string) => {
    setLoadingMusic(true);
    try {
      const [tracks, artists, current] = await Promise.all([
        fetchSpotifyData(token, "/me/top/tracks?limit=5&time_range=short_term"),
        fetchSpotifyData(token, "/me/top/artists?limit=5&time_range=short_term"),
        fetchSpotifyData(token, "/me/player/currently-playing"),
      ]);
      setTopTracks(tracks?.items ?? []);
      setTopArtists(artists?.items ?? []);
      setCurrentlyPlaying(current);
    } finally {
      setLoadingMusic(false);
    }
  };

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSendRequest = async () => {
    setActionLoading(true);
    try {
      await sendFriendRequest(user!.uid, myProfile!.username, uid!, friendProfile!.username);
      setRelation("sent");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingReq) return;
    setActionLoading(true);
    try {
      await declineOrCancelRequest(pendingReq.id);
      setRelation("none");
      setPendingReq(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = () => {
    Alert.alert("Remove Friend", `Remove @${friendProfile?.username}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeFriend(user!.uid, uid!);
            setRelation("none");
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!friendProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 40 },
      ]}
      refreshControl={<RefreshControl refreshing={loadingProfile} onRefresh={loadProfile} tintColor={colors.primary} />}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="chevron-left" size={24} color={colors.foreground} />
      </TouchableOpacity>

      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={[styles.bigAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.bigAvatarText, { color: colors.primary }]}>
            {friendProfile.username[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.foreground }]}>@{friendProfile.username}</Text>

        {friendProfile.spotifyConnected && (
          <View style={[styles.spotifyBadge, { backgroundColor: "#1DB95420", borderColor: "#1DB954" }]}>
            <Feather name="music" size={12} color="#1DB954" />
            <Text style={styles.spotifyBadgeText}>Spotify Connected</Text>
          </View>
        )}

        {/* Relation action button */}
        <View style={styles.actionRow}>
          {relation === "friends" ? (
            <TouchableOpacity
              style={[styles.relationBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleRemoveFriend}
              activeOpacity={0.8}
            >
              <Feather name="user-check" size={16} color={colors.mutedForeground} />
              <Text style={[styles.relationBtnText, { color: colors.mutedForeground }]}>Friends</Text>
            </TouchableOpacity>
          ) : relation === "sent" ? (
            <TouchableOpacity
              style={[styles.relationBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleCancelRequest}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <>
                  <Feather name="clock" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.relationBtnText, { color: colors.mutedForeground }]}>Requested</Text>
                </>
              )}
            </TouchableOpacity>
          ) : relation === "received" ? (
            <TouchableOpacity
              style={[styles.relationBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/friends")}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={16} color="#000" />
              <Text style={[styles.relationBtnText, { color: "#000" }]}>Respond to Request</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.relationBtn, { backgroundColor: colors.primary }]}
              onPress={handleSendRequest}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Feather name="user-plus" size={16} color="#000" />
                  <Text style={[styles.relationBtnText, { color: "#000" }]}>Add Friend</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Music section — only visible to friends */}
      {relation === "friends" ? (
        <>
          {loadingMusic ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <>
              {currentlyPlaying?.item && (
                <View style={styles.section}>
                  <NowPlayingBar currentlyPlaying={currentlyPlaying} />
                </View>
              )}

              <View style={styles.section}>
                <SectionHeader title="Top Tracks" subtitle="Last 4 weeks" />
                {topTracks.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.mutedForeground }]}>No data yet</Text>
                ) : (
                  topTracks.map((track, i) => (
                    <TrackRow key={track.id} track={track} index={i} showIndex />
                  ))
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader title="Top Artists" subtitle="Last 4 weeks" />
                {topArtists.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.mutedForeground }]}>No data yet</Text>
                ) : (
                  topArtists.map((artist, i) => (
                    <ArtistRow key={artist.id} artist={artist} index={i} showIndex />
                  ))
                )}
              </View>
            </>
          )}
        </>
      ) : (
        <View style={styles.lockedSection}>
          <Feather name="lock" size={32} color={colors.mutedForeground} />
          <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
            Add {friendProfile.username} as a friend to see their music taste
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: { marginBottom: 16 },
  profileHeader: { alignItems: "center", gap: 10, marginBottom: 32 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  bigAvatarText: { fontSize: 36, fontFamily: "Inter_700Bold" },
  username: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  spotifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  spotifyBadgeText: { color: "#1DB954", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionRow: { marginTop: 4 },
  relationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  relationBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  section: { marginBottom: 28 },
  loader: { marginVertical: 24 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  lockedSection: { alignItems: "center", marginTop: 48, gap: 14, paddingHorizontal: 24 },
  lockedText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
