import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { SpotifyArtist } from "@/context/SpotifyContext";

interface Props {
  artist: SpotifyArtist;
  index?: number;
  showIndex?: boolean;
}

export function ArtistRow({ artist, index, showIndex }: Props) {
  const colors = useColors();
  const imageUrl = artist.images[0]?.url;
  const genre = artist.genres[0] ?? "";

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
          {artist.name}
        </Text>
        {genre ? (
          <Text style={[styles.genre, { color: colors.mutedForeground }]} numberOfLines={1}>
            {genre}
          </Text>
        ) : null}
      </View>
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
    borderRadius: 23,
  },
  imagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  genre: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
});
