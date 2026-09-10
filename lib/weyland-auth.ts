// Auth helper for the Weyland Open Platform API (open.weess.com).
//
// The API only issues short-lived bearer tokens (valid ~7 days) via a
// username/password login endpoint. Instead of storing a static token in
// the environment, we log in on demand and cache the token in memory,
// refreshing it automatically shortly before it expires.

interface WeylandLoginResponse {
  code?: number;
  message?: string;
  data?: {
    accessToken: string;
    // Despite the name, this is an absolute Unix timestamp in seconds
    // (matches the `exp` claim inside the JWT itself), not a duration.
    expiredIn: number;
  };
}

// In-memory cache, shared across requests within the same server process.
// Not persisted — on a cold start / new instance we simply log in again.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// Refresh this long before the actual expiry, so a slow request never
// hits an already-expired token.
const REFRESH_MARGIN_MS = 60 * 60 * 1000; // 1 hour

function getWeylandApiUrl(): string {
  const apiUrl = process.env.WEYLAND_API_URL;
  if (!apiUrl) {
    throw new Error("WEYLAND_API_URL muss gesetzt sein."); // "... must be set."
  }
  return apiUrl;
}

// Logs in with username/password and returns a fresh access token.
async function login(): Promise<{ accessToken: string; expiresAt: number }> {
  const username = process.env.WEYLAND_USERNAME;
  const password = process.env.WEYLAND_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "WEYLAND_USERNAME und WEYLAND_PASSWORD müssen gesetzt sein.", // "... must be set."
    );
  }

  const res = await fetch(`${getWeylandApiUrl()}/api-open/ems/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Weyland-Login fehlgeschlagen: HTTP ${res.status}`);
  }

  const json = (await res.json()) as WeylandLoginResponse;
  const accessToken = json.data?.accessToken;
  const expiredIn = json.data?.expiredIn;

  if (!accessToken || !expiredIn) {
    throw new Error("Weyland-Login lieferte kein gültiges Token."); // "... returned no valid token."
  }

  return {
    accessToken,
    expiresAt: expiredIn * 1000, // absolute timestamp, seconds -> ms
  };
}

/**
 * Returns a valid Weyland bearer token, logging in (or re-logging in)
 * automatically when there is none cached yet or it is about to expire.
 */
export async function getWeylandAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  cachedToken = await login();
  return cachedToken.accessToken;
}

/**
 * Performs an authenticated GET request against a Weyland API path
 * (e.g. "/api-open/ems/v1/overview"), automatically attaching the bearer
 * token, clientId and device serial number query params.
 */
export async function weylandGet<T>(path: string): Promise<T> {
  const clientId = process.env.WEYLAND_CLIENT_ID;
  const deviceSn = process.env.WEYLAND_DEVICE_SN;

  if (!clientId || !deviceSn) {
    throw new Error(
      "WEYLAND_CLIENT_ID und WEYLAND_DEVICE_SN müssen gesetzt sein.", // "... must be set."
    );
  }

  const accessToken = await getWeylandAccessToken();
  const url = new URL(`${getWeylandApiUrl()}${path}`);
  url.searchParams.set("sn", deviceSn);
  url.searchParams.set("clientId", clientId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Weyland-API-Fehler: HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
