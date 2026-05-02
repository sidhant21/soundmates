import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  getIncomingRequests,
  getFriendUids,
  getUserProfiles,
  acceptFriendRequest,
  declineOrCancelRequest,
  removeFriend,
  type FriendRequest,
  type UserProfile,
} from "@/lib/friends";

type Tab = "friends" | "requests";

export default function FriendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [uids, reqs] = await Promise.all([
        getFriendUids(user.uid),
        getIncomingRequests(user.uid),
      ]);
      const profiles = await getUserProfiles(uids);
      setFriends(profiles);
      setRequests(reqs);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAccept = async (req: FriendRequest) => {
    setActionLoading(req.id);
    try {
      await acceptFriendRequest(req);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (req: FriendRequest) => {
    setActionLoading(req.id + "_decline");
    try {
      await declineOrCancelRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = (friend: UserProfile) => {
    Alert.alert("Remove Friend", `Remove @${friend.username}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeFriend(user!.uid, friend.uid);
            setFriends((prev) => prev.filter((f) => f.uid !== friend.uid));
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const renderFriend = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push({ pathname: "/friend/[uid]", params: { uid: item.uid } })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {item.username[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.foreground }]}>@{item.username}</Text>
        {item.spotifyConnected && (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Spotify connected</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={8}>
        <Feather name="user-minus" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => {
    const accepting = actionLoading === item.id;
    const declining = actionLoading === item.id + "_decline";
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {item.fromUsername[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.username, { color: colors.foreground }]}>@{item.fromUsername}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Wants to be friends</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAccept(item)}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name="check" size={16} color="#000" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => handleDecline(item)}
            disabled={declining}
          >
            {declining ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Feather name="x" size={16} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Friends</Text>
        <View style={[styles.tabs, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "friends" && { backgroundColor: colors.primary }]}
            onPress={() => setTab("friends")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "friends" ? "#000" : colors.mutedForeground }]}>
              Friends {friends.length > 0 ? `(${friends.length})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "requests" && { backgroundColor: colors.primary }]}
            onPress={() => setTab("requests")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "requests" ? "#000" : colors.mutedForeground }]}>
              Requests {requests.length > 0 ? `(${requests.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No friends yet</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/search")} activeOpacity={0.8}>
              <Text style={[styles.emptyAction, { color: colors.primary }]}>Find people to add</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.uid}
            renderItem={renderFriend}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          />
        )
      ) : requests.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tabs: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  emptyAction: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 2 },
  username: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
