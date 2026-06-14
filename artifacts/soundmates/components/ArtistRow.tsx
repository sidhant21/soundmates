import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { LastfmArtist } from "@/context/LastfmContext";

interface Props {
  artist: LastfmArtist;
  index?: number;
  showIndex?: boolean;
}

export function ArtistRow({ artist, index, showIndex }: Props) {
  const colors = useColors();
  const images = artist.images || [];
  const imageUrl = images.length > 0 ? images[images.length - 1].url : null;

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
