/**
 * Spotify OAuth PKCE helpers + token refresh
 * Uses PKCE so no client secret is needed in the browser.
 * Tokens are persisted in Firestore via AuthContext.
 */
import * as Crypto from "expo-crypto";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "";

export const SPOTIFY_SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

// ─── Redirect URI ─────────────────────────────────────────────────────────────
export function getRedirectUri(): string {
  if (Platform.OS === "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}/`;
    // Using expo-auth-session for web proxy to handle HTTPS requirement from Spotify
    return AuthSession.makeRedirectUri({ scheme: "soundmates", path: "callback" });
  }
  // Native: custom URI scheme
  return AuthSession.makeRedirectUri({ scheme: "soundmates", path: "callback" });
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────
function base64urlEncode(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Helper to convert a hex string to a Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function generatePKCEPair(): Promise<{ verifier: string; challenge: string }> {
  // 1. Generate 32 random bytes
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  // 2. Base64url encode them to get the verifier
  const verifier = base64urlEncode(randomBytes);
  
  // 3. SHA-256 hash the verifier string
  // expo-crypto returns a hex string by default
  const digestHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier
  );
  
  // 4. Convert hex back to bytes, then base64url encode for the challenge
  const digestBytes = hexToBytes(digestHex);
  const challenge = base64urlEncode(digestBytes);

  return { verifier, challenge };
}

// ─── Build the Spotify authorization URL ──────────────────────────────────────
export function buildAuthUrl(challenge: string): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// ─── Exchange authorization code for tokens (PKCE — no secret needed) ─────────
export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Spotify token exchange failed: ${(err as any).error_description ?? res.status}`
    );
  }

  return res.json();
}

// ─── Refresh an access token (PKCE — no secret needed) ────────────────────────
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Spotify token refresh failed: ${(err as any).error_description ?? res.status}`
    );
  }

  return res.json();
}
