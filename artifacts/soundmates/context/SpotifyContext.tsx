import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { refreshSpotifyToken } from "@/lib/spotify";

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
  clearData: () => void;
}

const SpotifyContext = createContext<SpotifyContextType | null>(null);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateSpotifyTokens } = useAuth();
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // In-flight refresh promise — ensures only one refresh at a time
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Returns a valid access token, refreshing it first if it's within
   * 5 minutes of expiry or already expired.
   */
  const getValidToken = useCallback(
    async (overrideToken?: string): Promise<string> => {
      // If a fresh token was explicitly passed (e.g. right after OAuth), use it
      if (overrideToken) return overrideToken;

      const { spotifyAccessToken, spotifyRefreshToken, spotifyTokenExpiry } = profile ?? {};
      if (!spotifyAccessToken) return "";

      const fiveMinutes = 5 * 60 * 1000;
      const isExpired = !spotifyTokenExpiry || Date.now() > spotifyTokenExpiry - fiveMinutes;

      if (!isExpired) return spotifyAccessToken;

      // Token is stale — refresh it (deduplicated)
      if (!spotifyRefreshToken) return spotifyAccessToken; // can't refresh, try anyway

      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = (async () => {
          try {
            const data = await refreshSpotifyToken(spotifyRefreshToken);
            const newAccess = data.access_token;
            const newRefresh = data.refresh_token ?? spotifyRefreshToken;
            await updateSpotifyTokens(newAccess, newRefresh, data.expires_in);
            return newAccess;
          } finally {
            refreshPromiseRef.current = null;
          }
        })();
      }

      return refreshPromiseRef.current;
    },
    [profile, updateSpotifyTokens]
  );

  /** Wraps a Spotify API call with auth + 401 retry after refresh */
  const spotifyFetch = useCallback(
    async (endpoint: string, tokenOverride?: string) => {
      let token = await getValidToken(tokenOverride);
      if (!token) return null;

      let res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If 401, force a token refresh and retry once
      if (res.status === 401 && profile?.spotifyRefreshToken) {
        try {
          const data = await refreshSpotifyToken(profile.spotifyRefreshToken);
          token = data.access_token;
          await updateSpotifyTokens(token, data.refresh_token ?? profile.spotifyRefreshToken, data.expires_in);
          res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          return null;
        }
      }

      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
      return res.json();
    },
    [getValidToken, profile, updateSpotifyTokens]
  );

  const fetchTopTracks = useCallback(
    async (token?: string) => {
      setLoadingTracks(true);
      try {
        const data = await spotifyFetch("/me/top/tracks?limit=10&time_range=short_term", token);
        setTopTracks(data?.items ?? []);
      } catch {
        setTopTracks([]);
      } finally {
        setLoadingTracks(false);
      }
    },
    [spotifyFetch]
  );

  const fetchTopArtists = useCallback(
    async (token?: string) => {
      setLoadingArtists(true);
      try {
        const data = await spotifyFetch("/me/top/artists?limit=10&time_range=short_term", token);
        setTopArtists(data?.items ?? []);
      } catch {
        setTopArtists([]);
      } finally {
        setLoadingArtists(false);
      }
    },
    [spotifyFetch]
  );

  const fetchCurrentlyPlaying = useCallback(
    async (token?: string) => {
      setLoadingCurrent(true);
      try {
        const data = await spotifyFetch("/me/player/currently-playing", token);
        setCurrentlyPlaying(data);
      } catch {
        setCurrentlyPlaying(null);
      } finally {
        setLoadingCurrent(false);
      }
    },
    [spotifyFetch]
  );

  const fetchRecentlyPlayed = useCallback(
    async (token?: string) => {
      setLoadingRecent(true);
      try {
        const data = await spotifyFetch("/me/player/recently-played?limit=10", token);
        setRecentlyPlayed(data?.items ?? []);
      } catch {
        setRecentlyPlayed([]);
      } finally {
        setLoadingRecent(false);
      }
    },
    [spotifyFetch]
  );

  const fetchAllSpotifyData = useCallback(
    async (token?: string) => {
      await Promise.all([
        fetchTopTracks(token),
        fetchTopArtists(token),
        fetchCurrentlyPlaying(token),
        fetchRecentlyPlayed(token),
      ]);
    },
    [fetchTopTracks, fetchTopArtists, fetchCurrentlyPlaying, fetchRecentlyPlayed]
  );

  const clearData = useCallback(() => {
    setTopTracks([]);
    setTopArtists([]);
    setCurrentlyPlaying(null);
    setRecentlyPlayed([]);
  }, []);

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
        clearData,
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
