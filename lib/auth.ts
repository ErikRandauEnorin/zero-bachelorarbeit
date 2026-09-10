import crypto from "crypto";
import bcrypt from "bcrypt";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "enorin_zero_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours, in seconds

// Shape of the data encoded (in plain, non-encrypted form) inside a session token.
interface SessionPayload {
  userId: number;
  email: string;
  role: UserRole;
  tenantId: number | null;
  exp: number; // Expiry timestamp in ms since epoch
}

// Reads the HMAC signing secret from the environment, failing fast if it is missing.
function getAuthSecret(): string {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    throw new Error("AUTH_SECRET muss gesetzt sein."); // "AUTH_SECRET must be set."
  }

  return authSecret;
}

// Signs an arbitrary string payload with HMAC-SHA256 using the auth secret.
function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

// Creates a signed session token: base64url(payload) + "." + signature.
// The payload itself is not encrypted, only signed, so it must not contain secrets.
export function createSessionToken(user: {
  id: number;
  email: string;
  role: UserRole;
  tenantId: number | null;
}) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      exp: Date.now() + SESSION_MAX_AGE * 1000,
    } satisfies SessionPayload),
    "utf8",
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

// Verifies a session token's signature and expiry, returning the decoded
// payload if valid, or null if the token is missing, malformed, tampered
// with, or expired.
export function verifySessionToken(
  token: string | null | undefined,
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  // Recompute the expected signature and compare using a timing-safe check
  // to avoid leaking information via response-time side channels.
  const expectedSignature = signPayload(payload);
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionPayload;

    const validRole =
      data.role === "ADMIN" ||
      data.role === "CUSTOMER" ||
      data.role === "SUPPLIER";

    // Defensive validation of the decoded payload shape and expiry, in
    // case of unexpected/forged tokens.
    if (
      typeof data.userId !== "number" ||
      !Number.isInteger(data.userId) ||
      typeof data.email !== "string" ||
      !validRole ||
      (data.tenantId !== null && !Number.isInteger(data.tenantId)) ||
      typeof data.exp !== "number" ||
      data.exp < Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Looks up a user by email and checks the given password against the
// stored bcrypt hash. Returns the user (without the password hash) on
// success, or null if the email is unknown or the password is wrong.
export async function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await getPrisma().user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      tenantId: true,
    },
  });

  if (!user) {
    return null;
  }

  const passwordValid = await bcrypt.compare(password, user.password);

  if (!passwordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };
}