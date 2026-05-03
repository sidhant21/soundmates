import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  fetchLastfmAPI, 
  fetchCoverArtiTunes, 
  fetchCoverArtDeezer, 
  fetchArtistImageDeezer, 
  fetchArtistImageiTunes 
} from "@/lib/lastfm";

export interface LastfmTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
}

export interface LastfmArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  playcount?: number;
}

export interface CurrentlyPlaying {
  is_playing: boolean;
  item: LastfmTrack | null;
}

export interface RecentlyPlayed {
  track: LastfmTrack;
  played_at: string;
}

interface LastfmContextType {
  topTracks: LastfmTrack[];
  topArtists: LastfmArtist[];
  currentlyPlaying: CurrentlyPlaying | null;
  recentlyPlayed: RecentlyPlayed[];
  loadingTracks: boolean;
  loadingArtists: boolean;
  loadingCurrent: boolean;
  loadingRecent: boolean;
  fetchAllData: () => Promise<void>;
  clearData: () => void;
}



const LastfmContext = createContext<LastfmContextType | null>(null);

function mapTrack(t: any): LastfmTrack {
  const rawImages = t.image || [];
  // Filter out empty strings AND the generic Last.fm "star" placeholder hash
  const placeholderHash = "2a96cbd8b46e442fc41c2b86b821562f";
  const validImages = rawImages.filter((img: any) => {
    const url = img["#text"];
    return url && url.trim() !== "" && !url.includes(placeholderHash);
  });
  
  // Prioritize larger sizes
  const bestImage = 
    validImages.find((i: any) => i.size === "extralarge") ||
    validImages.find((i: any) => i.size === "large") ||
    validImages[validImages.length - 1];

  const images = bestImage ? [{ url: bestImage["#text"], width: 300, height: 300 }] : [];

  return {
    id: t.mbid || t.url || `${t.name}-${t.artist?.name || t.artist?.["#text"] || ""}`,
    name: t.name,
    artists: [{ name: t.artist?.name || t.artist?.["#text"] || "Unknown Artist" }],
    album: {
      name: t.album?.["#text"] || "",
      images: images,
    },
    duration_ms: 0,
  };
}

export function LastfmProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [topTracks, setTopTracks] = useState<LastfmTrack[]>([]);
  const [topArtists, setTopArtists] = useState<LastfmArtist[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);


  const fetchTopTracks = useCallback(async (username: string) => {
    setLoadingTracks(true);
    try {
      const data = await fetchLastfmAPI("user.getTopTracks", { user: username, limit: "10", period: "7day" });




      const rawTracks = data.toptracks?.track || [];
      
      const tracks = await Promise.all(rawTracks.map(async (t: any) => {
        let mapped = mapTrack(t);
        const artistName = t.artist?.name || t.artist?.["#text"];
        
        if (artistName && t.name) {
          try {
            // Layer 1: Deezer
            let art = await fetchCoverArtDeezer(artistName, t.name);
            // Layer 2: iTunes
            if (!art) {
              art = await fetchCoverArtiTunes(artistName, t.name);
            }
            
            if (art) {
              mapped.album.images = [{ url: art, width: 600, height: 600 }];
            }
          } catch { /* fallback to lastfm */ }
        }
        
        return mapped;
      }));
      
      setTopTracks(tracks);
    } catch {
      setTopTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  const fetchTopArtists = useCallback(async (username: string) => {
    setLoadingArtists(true);
    try {
      const data = await fetchLastfmAPI("user.getTopArtists", { user: username, limit: "10", period: "7day" });




      const rawArtists = data.topartists?.artist || [];

      const artists = await Promise.all(rawArtists.map(async (a: any) => {
        try {
          // Layer 1: Deezer
          let pic = await fetchArtistImageDeezer(a.name);
          // Layer 2: iTunes
          if (!pic) {
            pic = await fetchArtistImageiTunes(a.name);
          }

          if (pic) {
            return {
              id: a.mbid || a.url || a.name,
              name: a.name,
              images: [{ url: pic, width: 600, height: 600 }],
              playcount: parseInt(a.playcount, 10),
            };
          }
        } catch { /* fallback to lastfm info */ }

        // Fallback: Last.fm
        let rawImages = a.image || [];
        const placeholderHash = "2a96cbd8b46e442fc41c2b86b821562f";
        let validImages = rawImages.filter((img: any) => {
          const url = img["#text"];
          return url && url.trim() !== "" && !url.includes(placeholderHash);
        });

        if (validImages.length === 0) {
          try {
            const info = await fetchLastfmAPI("artist.getInfo", { artist: a.name });
            rawImages = info.artist?.image || [];
            validImages = rawImages.filter((img: any) => {
              const url = img["#text"];
              return url && url.trim() !== "" && !url.includes(placeholderHash);
            });
          } catch { /* ignore */ }
        }

        const bestImage = 
          validImages.find((i: any) => i.size === "extralarge") ||
          validImages.find((i: any) => i.size === "large") ||
          validImages[validImages.length - 1];

        return {
          id: a.mbid || a.url || a.name,
          name: a.name,
          images: bestImage ? [{ url: bestImage["#text"], width: 300, height: 300 }] : [],
          playcount: parseInt(a.playcount, 10),
        };
      }));

      setTopArtists(artists);
    } catch {
      setTopArtists([]);
    } finally {
      setLoadingArtists(false);
    }
  }, []);

  const fetchRecentAndCurrent = useCallback(async (username: string) => {
    setLoadingRecent(true);
    setLoadingCurrent(true);
    try {
      const data = await fetchLastfmAPI("user.getRecentTracks", { user: username, limit: "10" });
      const tracks = data.recenttracks?.track || [];
      
      const mappedTracks = await Promise.all(tracks.map(async (t: any) => {
        const mapped = mapTrack(t);
        const artistName = t.artist?.name || t.artist?.["#text"];
        
        // Tiered image fetching for recent tracks
        if (mapped.album.images.length === 0 && artistName && t.name) {
          try {
            let art = await fetchCoverArtDeezer(artistName, t.name);
            if (!art) art = await fetchCoverArtiTunes(artistName, t.name);
            if (art) {
              mapped.album.images = [{ url: art, width: 600, height: 600 }];
            }
          } catch { /* fallback to lastfm */ }
        }
        return mapped;
      }));

      let current: CurrentlyPlaying | null = null;
      let recent: RecentlyPlayed[] = [];

      if (tracks.length > 0 && tracks[0]["@attr"]?.nowplaying === "true") {
        current = {
          is_playing: true,
          item: mappedTracks[0],
        };
        recent = mappedTracks.slice(1).map((t, i) => ({
          track: t,
          played_at: tracks[i + 1].date?.["#text"] || "Unknown time",
        }));
      } else {
        recent = mappedTracks.map((t, i) => ({
          track: t,
          played_at: tracks[i].date?.["#text"] || "Unknown time",
        }));
      }

      setCurrentlyPlaying(current);
      setRecentlyPlayed(recent);
    } catch {
      setCurrentlyPlaying(null);
      setRecentlyPlayed([]);
    } finally {
      setLoadingRecent(false);
      setLoadingCurrent(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    const username = profile?.lastfmUsername;
    if (!username) return;

    await Promise.all([
      fetchTopTracks(username),
      fetchTopArtists(username),
      fetchRecentAndCurrent(username),
    ]);
  }, [profile?.lastfmUsername, fetchTopTracks, fetchTopArtists, fetchRecentAndCurrent]);




  const updateTrackPeriod = useCallback((newPeriod: LastfmPeriod) => {
    setTrackPeriod(newPeriod);
    setTopTracks([]); // Clear immediately for visual feedback
  }, []);

  const updateArtistPeriod = useCallback((newPeriod: LastfmPeriod) => {
    setArtistPeriod(newPeriod);
    setTopArtists([]); // Clear immediately for visual feedback
  }, []);




  const clearData = useCallback(() => {
    setTopTracks([]);
    setTopArtists([]);
    setCurrentlyPlaying(null);
    setRecentlyPlayed([]);
  }, []);

  return (
    <LastfmContext.Provider
      value={{
        topTracks,
        topArtists,
        currentlyPlaying,
        recentlyPlayed,
        loadingTracks,
        loadingArtists,
        loadingCurrent,
        loadingRecent,
        fetchAllData,
        clearData,
      }}



    >
      {children}
    </LastfmContext.Provider>
  );
}

export function useLastfm() {
  const ctx = useContext(LastfmContext);
  if (!ctx) throw new Error("useLastfm must be used within LastfmProvider");
  return ctx;
}
