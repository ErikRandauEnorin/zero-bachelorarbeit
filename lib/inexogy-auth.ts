// Auth helper for the inexogy public API (api.inexogy.com/public/v1).
//
// Unlike Weyland (username/password login for a bearer token), inexogy uses
// OAuth 1.0a with HMAC-SHA1: every request is individually signed using a
// fixed consumer key/secret and access token/secret (no interactive
// three-legged flow needed since the access token is already issued).

import { createHmac, randomBytes } from "crypto";

const API_BASE = "https://api.inexogy.com/public/v1";

// RFC 3986 percent-encoding — encodeURIComponent leaves a few reserved
// characters (!'()*) unescaped, which OAuth 1.0a signing requires encoded.
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function getCredentials() {
  const consumerKey = process.env.INEXOGY_CONSUMER_KEY;
  const consumerSecret = process.env.INEXOGY_CONSUMER_SECRET;
  const accessToken = process.env.INEXOGY_ACCESS_TOKEN;
  const tokenSecret = process.env.INEXOGY_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !tokenSecret) {
    throw new Error(
      "INEXOGY_CONSUMER_KEY, INEXOGY_CONSUMER_SECRET, INEXOGY_ACCESS_TOKEN und INEXOGY_TOKEN_SECRET müssen gesetzt sein.",
    );
  }
  return { consumerKey, consumerSecret, accessToken, tokenSecret };
}

// Builds the OAuth 1.0a "Authorization" header for a signed GET request,
// per RFC 5849 (HMAC-SHA1 signature base string + key).
function buildAuthHeader(
  url: string,
  queryParams: Record<string, string>,
): string {
  const { consumerKey, consumerSecret, accessToken, tokenSecret } =
    getCredentials();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // The signature base string covers both the oauth_* params and the
  // request's own query params, all sorted together by key.
  const allParams = { ...queryParams, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const baseString = ["GET", percentEncode(url), percentEncode(paramString)].join(
    "&",
  );

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

/**
 * Performs an OAuth 1.0a-signed GET request against an inexogy API path
 * (e.g. "/last_reading"), with optional query params (e.g. { meterId }).
 */
export async function inexogyGet<T>(
  path: string,
  queryParams: Record<string, string> = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const authHeader = buildAuthHeader(url, queryParams);

  const fullUrl = new URL(url);
  for (const [key, value] of Object.entries(queryParams)) {
    fullUrl.searchParams.set(key, value);
  }

  const res = await fetch(fullUrl, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`inexogy-API-Fehler: HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
