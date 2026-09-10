# Deployment auf Coolify

Die App wird als **Next.js Standalone-Server im Docker-Container** ausgeliefert
(`output: "standalone"` in `next.config.ts` + `Dockerfile`).

## Einmalig in Coolify einrichten

1. **New Resource → Application → Public/Private Repository**
   - Repository: `git@github.com:skulf16/enorin-zero.git`
   - Branch: `main`
2. **Build Pack: `Dockerfile`** auswählen (nicht Nixpacks).
   - Dockerfile Location: `/Dockerfile`
3. **Port: `3000`** (der Container lauscht auf `PORT=3000`, `HOSTNAME=0.0.0.0`).
4. **Domain** hinterlegen und SSL (Let's Encrypt) aktivieren.
5. **Deploy** klicken.

Ab dann deployt jeder Push auf `main` automatisch (Webhook), sofern
"Automatic Deployment" aktiv ist.

## Environment-Variablen

Aktuell **keine nötig** – die App läuft vollständig mit Mock-Daten.
Sobald echte APIs (Börsenpreis, Speicher-Telemetrie) angebunden werden,
hier die entsprechenden `NEXT_PUBLIC_*` bzw. Server-Variablen setzen.

## Healthcheck (optional)

- Pfad: `/`
- Erwarteter Status: `200`

## Lokal testen (falls Docker vorhanden)

```bash
docker build -t enorin-zero .
docker run --rm -p 3000:3000 enorin-zero
# → http://localhost:3000
```
