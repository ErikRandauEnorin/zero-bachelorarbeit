import "dotenv/config";
import bcrypt from "bcrypt";
import { getPrisma } from "../lib/prisma";

// One-off CLI script: creates (or updates) the initial admin user.
// Run manually, e.g. via `npx tsx scripts/create-admin.ts`, with
// INITIAL_ADMIN_PASSWORD set in the environment.
async function main() {
  const prisma = getPrisma();

  const email = "admin@enorin.de";
  const plainPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!plainPassword) {
    throw new Error("INITIAL_ADMIN_PASSWORD ist nicht gesetzt."); // "INITIAL_ADMIN_PASSWORD is not set."
  }

  // Hash the password before storing it; never persist plaintext passwords
  const password = await bcrypt.hash(plainPassword, 12);

  // Idempotent: creates the admin if missing, otherwise resets its password/role
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password,
      role: "ADMIN",
      tenantId: null,
    },
    create: {
      email,
      password,
      role: "ADMIN",
      tenantId: null,
    },
  });

  console.log(`Admin angelegt/aktualisiert: ${admin.email} (${admin.role})`); // "Admin created/updated: ..."

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Fehler beim Anlegen des Admins:", error); // "Error creating the admin:"

  try {
    await getPrisma().$disconnect();
  } catch {
    // The client may not have been created yet.
  }

  process.exitCode = 1;
});