"use client"; // Client component: uses hooks (useState/useRouter) and form events

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Submits credentials to the login API and redirects to the home page on success
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      // Show the server-provided error message, or a generic fallback
      const json = await res.json().catch(() => null);
      setError(json?.message ?? "Login fehlgeschlagen."); // "Login failed."
      return;
    }

    router.replace("/");
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/95 p-8 shadow-float backdrop-blur-sm">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
          <p className="mt-3 text-sm text-navy-900/60">
            Bitte melde dich mit deinem Konto an, um das Zero Portal zu nutzen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-navy-900">
            E-Mail-Adresse
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="input mt-2 w-full"
              placeholder="name@beispiel.de"
            />
          </label>

          <label className="block text-sm font-semibold text-navy-900">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="input mt-2 w-full"
              placeholder="Dein Passwort"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-signal-red/20 bg-signal-red/10 px-4 py-3 text-sm text-signal-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-lime-400 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Anmeldung…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
