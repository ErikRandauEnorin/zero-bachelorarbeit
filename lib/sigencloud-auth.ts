// Auth helper for the Sigen Cloud OpenAPI (developer.sigencloud.com).
//
// The API issues short-lived bearer tokens (valid ~12h) via a key-based
// login endpoint. Unlike the other endpoints, login lives on a different
// host (api-eu) than the rest of the API (openapi-eu). We log in on demand
// and cache the token in memory, refreshing it automatically shortly before
// it expires.

const AUTH_BASE_URL = "https://api-eu.sigencloud.com";
const API_BASE_URL = "https://openapi-eu.sigencloud.com";

interface SigencloudEnvelope<T> {
  code?: number;
  msg?: string;
  timestamp?: number;
  // `data` frequently comes back as a JSON-encoded string instead of a
  // plain object/array — needs a second JSON.parse.
  data?: T | string;
}

interface SigencloudLoginData {
  tokenType?: string;
  accessToken: string;
  expiresIn: number; // seconds, relative duration (not an absolute timestamp)
}

// In-memory cache, shared across requests within the same server process.
// Not persisted — on a cold start / new instance we simply log in again.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// Refresh this long before the actual expiry, so a slow request never
// hits an already-expired token.
const REFRESH_MARGIN_MS = 60 * 60 * 1000; // 1 hour

function getLoginKey(): string {
  const key = process.env.SIGENCLOUD_LOGIN_KEY;
  if (!key) {
    throw new Error("SIGENCLOUD_LOGIN_KEY muss gesetzt sein."); // "... must be set."
  }
  return key;
}

// Sigen Cloud's `data` field is sometimes the payload directly and
// sometimes that same payload JSON-encoded as a string — normalize both.
export function parseSigencloudData<T>(data: T | string | undefined): T | undefined {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return undefined;
    }
  }
  return data;
}

// Logs in with the configured key and returns a fresh access token.
async function login(): Promise<{ accessToken: string; expiresAt: number }> {
  const key = getLoginKey();

  const res = await fetch(`${AUTH_BASE_URL}/openapi/auth/login/key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Sigencloud-Login fehlgeschlagen: HTTP ${res.status}`);
  }

  const json = (await res.json()) as SigencloudEnvelope<SigencloudLoginData>;
  const data = parseSigencloudData(json.data);

  if (!data?.accessToken || !data.expiresIn) {
    throw new Error("Sigencloud-Login lieferte kein gültiges Token."); // "... returned no valid token."
  }

  return {
    accessToken: data.accessToken,
    expiresAt: Date.now() + data.expiresIn * 1000, // relative seconds -> absolute ms
  };
}

/**
 * Returns a valid Sigen Cloud bearer token, logging in (or re-logging in)
 * automatically when there is none cached yet or it is about to expire.
 */
export async function getSigencloudAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  cachedToken = await login();
  return cachedToken.accessToken;
}

/**
 * Performs an authenticated GET request against a Sigen Cloud API path
 * (e.g. "/openapi/system"), automatically attaching the bearer token.
 * Returns the raw response envelope ({ code, msg, timestamp, data }) —
 * callers should run `parseSigencloudData` on `.data` themselves.
 */
export async function sigencloudGet<T>(
  path: string,
  queryParams: Record<string, string> = {},
): Promise<SigencloudEnvelope<T>> {
  const accessToken = await getSigencloudAccessToken();
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Sigencloud-API-Fehler: HTTP ${res.status}`);
  }

  return (await res.json()) as SigencloudEnvelope<T>;
}
