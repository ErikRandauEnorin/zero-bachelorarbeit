import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import AssetsView from "@/components/AssetsView";
import { mockAssets } from "@/lib/mock-data";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Home page (server component): gated behind a valid session cookie.
export default async function Home() {
  // Read and verify the session cookie on the server before rendering
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) {
    // Not logged in: show a prompt with a link to the login page
    return (
      <div className="min-h-svh flex items-center justify-center bg-background px-4 py-8">
        <div className="rounded-[2rem] border border-black/5 bg-white/95 p-10 text-center shadow-float backdrop-blur-sm">
          <p className="text-lg font-semibold text-navy-950">Bitte zuerst einloggen.</p>
          <p className="mt-3 text-sm text-navy-900/60">Du wirst automatisch zur Login-Seite weitergeleitet.</p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-lime-400 transition hover:bg-navy-800"
          >
            Zur Anmeldung
          </a>
        </div>
      </div>
    );
  }

  // Logged in: render the main app shell with sidebar and asset overview
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <AssetsView assets={mockAssets} />
      </main>
    </div>
  );
}
