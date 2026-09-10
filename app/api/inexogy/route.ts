import { NextResponse } from "next/server";
import { inexogyGet } from "@/lib/inexogy-auth";

// Run the handler on every request; each request is freshly OAuth1-signed.
export const dynamic = "force-dynamic";

// Physical smart meter serial -> inexogy meterId, as provided for this account.
const METERS = [
  { serial: "1EMH0012926750", meterId: "cd9c9cbc666a4761ac8704e3a746fd7c" },
  { serial: "1EMH0013003667", meterId: "52b46ae5b62549668fd9ed4698275497" },
] as const;

interface InexogyLastReading {
  time?: number; // ms since epoch
  values?: {
    power?: number; // mW
    [key: string]: number | undefined;
  };
}

/**
 * Current reading per inexogy smart meter (last_reading endpoint).
 * Response: { meters: [{ serial, meterId, powerW, updatedAt, source }] }.
 */
export async function GET() {
  const meters = await Promise.all(
    METERS.map(async ({ serial, meterId }) => {
      try {
        const json = await inexogyGet<InexogyLastReading>("/last_reading", {
          meterId,
        });
        const powerMw = json.values?.power;
        return {
          serial,
          meterId,
          powerW: powerMw != null ? powerMw / 1000 : null,
          updatedAt: json.time
            ? new Date(json.time).toISOString()
            : new Date().toISOString(),
          source: "inexogy" as const,
        };
      } catch {
        // Network/auth error or malformed response — fall back for this meter only
        return {
          serial,
          meterId,
          powerW: null,
          updatedAt: new Date().toISOString(),
          source: "fallback" as const,
        };
      }
    }),
  );

  return NextResponse.json({ meters });
}
