import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated, Easing } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { CurrentlyPlaying } from "@/context/SpotifyContext";

interface Props {
  currentlyPlaying: CurrentlyPlaying;
}

export function NowPlayingBar({ currentlyPlaying }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentlyPlaying.is_playing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [currentlyPlaying.is_playing]);

  if (!currentlyPlaying.item) return null;
  const { item, is_playing } = currentlyPlaying;
  const imageUrl = item.album.images[0]?.url;
  const artistNames = item.artists.map((a) => a.name).join(", ");

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.left}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]} />
          )}
        </Animated.View>
        <View style={styles.dot}>
          <View style={[styles.dotInner, { backgroundColor: is_playing ? colors.primary : colors.mutedForeground }]} />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.primary }]}>
          {is_playing ? "Now Playing" : "Paused"}
        </Text>
        <Text style={[styles.track, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.artist, { color: colors.mutedForeground }]} numberOfLines={1}>
          {artistNames}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    marginBottom: 16,
  },
  left: { position: "relative" },
  image: { width: 52, height: 52, borderRadius: 8 },
  imagePlaceholder: { width: 52, height: 52, borderRadius: 8 },
  dot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: { width: 9, height: 9, borderRadius: 5 },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  track: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  artist: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
