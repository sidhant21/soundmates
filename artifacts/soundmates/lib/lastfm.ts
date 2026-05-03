import { Platform } from "react-native";

export const LASTFM_API_KEY = process.env.EXPO_PUBLIC_LASTFM_API_KEY ?? "";
export const LASTFM_SHARED_SECRET = process.env.EXPO_PUBLIC_LASTFM_SHARED_SECRET ?? "";

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

function getUrl(url: string) {
  if (Platform.OS === "web") {
    // Using a more robust encoding for proxies
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Helper to fetch data from Last.fm API
 */
export async function fetchLastfmAPI(method: string, params: Record<string, string> = {}) {
  // Manually build the query string to be absolutely sure of the order and encoding
  const baseParams = {
    method,
    api_key: LASTFM_API_KEY,
    format: "json",
    ...params,
  };

  const queryString = Object.entries(baseParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const fullUrl = `${BASE_URL}?${queryString}&_ts=${Date.now()}`;
  const res = await fetch(getUrl(fullUrl));
  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);

  const data = await res.json();
  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  return data;
}


/**
 * Fetch high-quality cover art from iTunes Search API.
 */
export async function fetchCoverArtiTunes(artist: string, track: string): Promise<string | null> {
  try {
    const searchTerm = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(getUrl(`https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=5`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const bestMatch = data.results.find((r: any) => 
        r.artistName.toLowerCase().includes(artist.toLowerCase()) || 
        artist.toLowerCase().includes(r.artistName.toLowerCase())
      ) || data.results[0];
      return bestMatch.artworkUrl100.replace("100x100bb", "600x600bb");
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCoverArtDeezer(artist: string, track: string): Promise<string | null> {
  try {
    const searchTerm = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(getUrl(`https://api.deezer.com/search/track?q=${searchTerm}`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const filtered = data.data.filter((r: any) => 
        r.artist?.name.toLowerCase().includes(artist.toLowerCase()) || 
        artist.toLowerCase().includes(r.artist?.name.toLowerCase())
      );
      const results = filtered.length > 0 ? filtered : data.data;
      for (const result of results) {
        const cover = result.album?.cover_xl || result.album?.cover_big || result.album?.cover_medium;
        if (cover && !cover.includes("d41d8cd98f00b204e9800998ecf8427e")) {
          return cover;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchArtistImageDeezer(artist: string): Promise<string | null> {
  try {
    const searchTerm = encodeURIComponent(artist);
    const res = await fetch(getUrl(`https://api.deezer.com/search/artist?q=${searchTerm}`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const results = [...data.data].sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));
      for (const result of results) {
        const pic = result.picture_xl || result.picture_big || result.picture_medium;
        if (pic && !pic.includes("d41d8cd98f00b204e9800998ecf8427e")) {
          return pic;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchArtistImageiTunes(artist: string): Promise<string | null> {
  try {
    const searchTerm = encodeURIComponent(artist);
    const res = await fetch(getUrl(`https://itunes.apple.com/search?term=${searchTerm}&entity=musicArtist&limit=1`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].artworkUrl100?.replace("100x100bb", "600x600bb") || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyLastfmUser(username: string): Promise<boolean> {
  try {
    const data = await fetchLastfmAPI("user.getInfo", { user: username });
    return !!data.user;
  } catch (e) {
    return false;
  }
}
