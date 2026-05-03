import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { SpotifyTrack } from "@/context/SpotifyContext";

interface Props {
  track: SpotifyTrack;
  index?: number;
  showIndex?: boolean;
  countLabel?: string;
}

export function TrackRow({ track, index, showIndex, countLabel }: Props) {
  const colors = useColors();
  const imageUrl = track.album?.images?.[0]?.url;
  const artistNames = track.artists?.map((a) => a.name).join(", ") ?? "";

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {showIndex && (
        <Text style={[styles.index, { color: colors.mutedForeground }]}>
          {(index ?? 0) + 1}
        </Text>
      )}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={[styles.artists, { color: colors.mutedForeground }]} numberOfLines={1}>
          {artistNames}
        </Text>
      </View>
      {countLabel && (
        <Text style={[styles.countLabel, { color: colors.primary }]}>{countLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  index: {
    width: 20,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  image: {
    width: 46,
    height: 46,
    borderRadius: 6,
  },
  imagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  artists: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  countLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(29, 185, 84, 0.15)", // Subtle Spotify green background
  },
});
