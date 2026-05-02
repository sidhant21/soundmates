import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  preview_url?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  followers: { total: number };
}

export interface CurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number;
}

export interface RecentlyPlayed {
  track: SpotifyTrack;
  played_at: string;
}

interface SpotifyContextType {
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  currentlyPlaying: CurrentlyPlaying | null;
  recentlyPlayed: RecentlyPlayed[];
  loadingTracks: boolean;
  loadingArtists: boolean;
  loadingCurrent: boolean;
  loadingRecent: boolean;
  fetchTopTracks: (token?: string) => Promise<void>;
  fetchTopArtists: (token?: string) => Promise<void>;
  fetchCurrentlyPlaying: (token?: string) => Promise<void>;
  fetchRecentlyPlayed: (token?: string) => Promise<void>;
  fetchAllSpotifyData: (token?: string) => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType | null>(null);

async function spotifyFetch(endpoint: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
}

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const getToken = (token?: string) => token ?? profile?.spotifyAccessToken ?? "";

  const fetchTopTracks = useCallback(async (token?: string) => {
    const t = getToken(token);
    if (!t) return;
    setLoadingTracks(true);
    try {
      const data = await spotifyFetch("/me/top/tracks?limit=5&time_range=short_term", t);
      setTopTracks(data?.items ?? []);
    } catch {
      setTopTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, [profile?.spotifyAccessToken]);

  const fetchTopArtists = useCallback(async (token?: string) => {
    const t = getToken(token);
    if (!t) return;
    setLoadingArtists(true);
    try {
      const data = await spotifyFetch("/me/top/artists?limit=5&time_range=short_term", t);
      setTopArtists(data?.items ?? []);
    } catch {
      setTopArtists([]);
    } finally {
      setLoadingArtists(false);
    }
  }, [profile?.spotifyAccessToken]);

  const fetchCurrentlyPlaying = useCallback(async (token?: string) => {
    const t = getToken(token);
    if (!t) return;
    setLoadingCurrent(true);
    try {
      const data = await spotifyFetch("/me/player/currently-playing", t);
      setCurrentlyPlaying(data);
    } catch {
      setCurrentlyPlaying(null);
    } finally {
      setLoadingCurrent(false);
    }
  }, [profile?.spotifyAccessToken]);

  const fetchRecentlyPlayed = useCallback(async (token?: string) => {
    const t = getToken(token);
    if (!t) return;
    setLoadingRecent(true);
    try {
      const data = await spotifyFetch("/me/player/recently-played?limit=10", t);
      setRecentlyPlayed(data?.items ?? []);
    } catch {
      setRecentlyPlayed([]);
    } finally {
      setLoadingRecent(false);
    }
  }, [profile?.spotifyAccessToken]);

  const fetchAllSpotifyData = useCallback(async (token?: string) => {
    await Promise.all([
      fetchTopTracks(token),
      fetchTopArtists(token),
      fetchCurrentlyPlaying(token),
      fetchRecentlyPlayed(token),
    ]);
  }, [fetchTopTracks, fetchTopArtists, fetchCurrentlyPlaying, fetchRecentlyPlayed]);

  return (
    <SpotifyContext.Provider
      value={{
        topTracks,
        topArtists,
        currentlyPlaying,
        recentlyPlayed,
        loadingTracks,
        loadingArtists,
        loadingCurrent,
        loadingRecent,
        fetchTopTracks,
        fetchTopArtists,
        fetchCurrentlyPlaying,
        fetchRecentlyPlayed,
        fetchAllSpotifyData,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
}
