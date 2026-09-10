import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  SESSION_MAX_AGE,
  validateCredentials,
} from "@/lib/auth";

// Login endpoint: validates credentials and, on success, sets a signed
// session cookie.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Normalize email input (trim + lowercase) and coerce values to strings
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "E-Mail-Adresse und Passwort sind erforderlich." }, // "Email and password are required."
        { status: 400 },
      );
    }

    // Look up the user and check the password hash (see lib/auth.ts)
    const user = await validateCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { message: "Ungültige Zugangsdaten." }, // "Invalid credentials."
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });

    // Issue the signed session token as an httpOnly cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: createSessionToken(user),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only require HTTPS in production
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Login fehlgeschlagen:", error); // "Login failed:"

    return NextResponse.json(
      { message: "Fehler beim Login." }, // "Error during login."
      { status: 500 },
    );
  }
}