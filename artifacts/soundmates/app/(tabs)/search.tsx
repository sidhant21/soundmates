import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  searchUsers,
  sendFriendRequest,
  checkFriendship,
  getPendingRequestBetween,
  type UserProfile,
} from "@/lib/friends";

type RelationState = "none" | "friends" | "sent" | "received" | "loading";

interface ResultItem {
  user: UserProfile;
  relation: RelationState;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const users = await searchUsers(text, user!.uid);
      const items: ResultItem[] = await Promise.all(
        users.map(async (u) => {
          const [isFriend, pending] = await Promise.all([
            checkFriendship(user!.uid, u.uid),
            getPendingRequestBetween(user!.uid, u.uid),
          ]);
          let relation: RelationState = "none";
          if (isFriend) relation = "friends";
          else if (pending?.fromUid === user!.uid) relation = "sent";
          else if (pending?.toUid === user!.uid) relation = "received";
          return { user: u, relation };
        })
      );
      setResults(items);
    } catch (e) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [user]);

  const handleAdd = async (item: ResultItem) => {
    setActionLoading(item.user.uid);
    try {
      await sendFriendRequest(user!.uid, profile!.username, item.user.uid, item.user.username);
      setResults((prev) =>
        prev.map((r) => r.user.uid === item.user.uid ? { ...r, relation: "sent" } : r)
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not send request");
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: ResultItem }) => {
    const isLoading = actionLoading === item.user.uid;
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push({ pathname: "/friend/[uid]", params: { uid: item.user.uid } })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {item.user.username[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.username, { color: colors.foreground }]}>@{item.user.username}</Text>
          {item.user.lastfmUsername && (
            <Text style={[styles.spotifyTag, { color: colors.mutedForeground }]}>
              Last.fm connected
            </Text>
          )}
        </View>
        {item.relation === "friends" ? (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Friends</Text>
          </View>
        ) : item.relation === "sent" ? (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Requested</Text>
          </View>
        ) : item.relation === "received" ? (
          <View style={[styles.badge, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Respond</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAdd(item)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name="user-plus" size={16} color="#000" />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by username..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searching ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : results.length === 0 && query.length >= 2 ? (
        <View style={styles.empty}>
          <Feather name="users" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No users found</Text>
        </View>
      ) : query.length < 2 && query.length > 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Type at least 2 characters</Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Find people by username</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.user.uid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 2 },
  username: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  spotifyTag: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
