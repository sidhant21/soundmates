import { Router } from "express";

const router = Router();

// POST /api/spotify/token
// Exchanges a Spotify authorization code for access + refresh tokens
router.post("/token", async (req, res) => {
  const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };

  if (!code || !redirectUri) {
    res.status(400).json({ error: "code and redirectUri are required" });
    return;
  }

  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "Spotify credentials not configured" });
    return;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    req.log.error({ err }, "Spotify token exchange failed");
    res.status(400).json({ error: "Failed to exchange Spotify token", details: err });
    return;
  }

  const data = await tokenRes.json();
  res.json(data);
});

// POST /api/spotify/refresh
// Refreshes a Spotify access token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "Spotify credentials not configured" });
    return;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    res.status(400).json({ error: "Failed to refresh Spotify token", details: err });
    return;
  }

  const data = await tokenRes.json();
  res.json(data);
});

export default router;
