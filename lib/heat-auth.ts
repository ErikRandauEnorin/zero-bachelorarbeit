// Auth helper for the HEAT Cloud API (doc.heat-solutions.com/cloud-api).
//
// HEAT uses a static bearer token in the form "KEY-ID.KEY-SECRET" — no
// login/refresh flow needed, the token is simply attached to every request.

const API_BASE = "https://cloud.heat-solutions.com/api/v1";

function getAccessToken(): string {
  const token = process.env.HEAT_API_KEY;
  if (!token) {
    throw new Error("HEAT_API_KEY muss gesetzt sein."); // "... must be set."
  }
  return token;
}

/**
 * Performs an authenticated GET request against a HEAT Cloud API path
 * (e.g. "/public/sites"), automatically attaching the bearer token.
 */
export async function heatGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HEAT-API-Fehler: HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
