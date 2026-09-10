import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

// Logout endpoint: clears the session cookie by overwriting it with an
// empty value and an expiry date in the past.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0, // Expire immediately
    expires: new Date(0), // Belt-and-suspenders for older browsers
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
