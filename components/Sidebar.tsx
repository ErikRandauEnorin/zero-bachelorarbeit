"use client"; // Client component: needed because we use hooks (useRouter) and event handlers

import { useRouter } from "next/navigation";
import {
  Container,
  LayoutDashboard,
  LineChart,
  Receipt,
  Settings,
  TrendingUp,
} from "lucide-react";
import Wordmark from "./Wordmark";

// Static list of navigation entries shown in the sidebar.
// "soon" marks items that are not yet implemented (rendered disabled with a "bald" badge).
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, soon: true },
  { id: "assets", label: "Assets", icon: Container, soon: false },
  { id: "handel", label: "Vermarktung", icon: TrendingUp, soon: true },
  { id: "prognose", label: "Prognosen", icon: LineChart, soon: true },
  { id: "abrechnung", label: "Abrechnung", icon: Receipt, soon: true },
];

export default function Sidebar() {
  const router = useRouter(); // Used to redirect to /login after logout

  return (
    // Fixed-width sidebar container, full height, light background with a subtle right border
    <aside className="flex w-64 shrink-0 flex-col border-r border-black/5 bg-white">
      {/* Header area with the app wordmark/logo */}
      <div className="flex h-16 items-center px-6">
        <Wordmark className="text-xl" />
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* Section label above the nav items */}
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-900/35">
          Energieportal
        </p>
        {NAV.map((item) => {
          const Icon = item.icon;
          // Hardcoded: "assets" is currently treated as the active/selected route
          const active = item.id === "assets";
          return (
            <button
              key={item.id}
              disabled={item.soon} // Disable buttons for features not yet available
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-navy-900 text-lime-400 shadow-card" // Style for the currently active nav item
                  : item.soon
                    ? "cursor-not-allowed text-navy-900/30" // Style for disabled/upcoming items
                    : "text-navy-900/70 hover:bg-mist hover:text-navy-900" // Style for regular, clickable items
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.soon && (
                // "Coming soon" badge shown next to not-yet-available nav items
                <span className="rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-medium text-navy-900/40">
                  bald
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section: settings and logout actions */}
      <div className="border-t border-black/5 p-3 space-y-2">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-900/60 transition hover:bg-mist hover:text-navy-900">
          <Settings size={18} />
          Einstellungen
        </button>
        <button
          type="button"
          onClick={async () => {
            // Call the logout API endpoint, then redirect the user to the login page
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl bg-signal-red/10 px-3 py-2.5 text-sm font-semibold text-signal-red transition hover:bg-signal-red/20"
        >
          <Receipt size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
