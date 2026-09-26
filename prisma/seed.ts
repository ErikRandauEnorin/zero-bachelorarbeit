// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ist nicht gesetzt.`);
  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const weylandDeviceSn = requireEnv("WEYLAND_DEVICE_SN");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Demo-Tenant (idempotent)
  const tenant = await prisma.tenant.upsert({
    where: { name: "Demo-Energiecommunity" },
    update: {},
    create: {
      name: "Demo-Energiecommunity",
      type: "CUSTOMER",
    },
  });

  // Demo-Asset mit vollständigen Stammdaten (idempotent)
  const asset = await prisma.asset.upsert({
    where: {
      tenantId_externalId: {
        tenantId: tenant.id,
        externalId: "weyland-device-1",
      },
    },
    update: {
      name: "Demo-Speicher Weyland",
      type: "BATTERY",
      manufacturer: "Weyland",
      model: "Weyland WL2N1",
      street: "Musterstraße 1",
      zip: "4020",
      city: "Linz",
      country: "AT",
      lat: 48.3069,
      lng: 14.2858,
      commissionedAt: new Date("2024-01-01T00:00:00.000Z"),
      connectionKw: 3.0,
      capacityKwh: 6.5,
    },
    create: {
      externalId: "weyland-device-1",
      name: "Demo-Speicher Weyland",
      type: "BATTERY",
      tenantId: tenant.id,
      manufacturer: "Weyland",
      model: "Weyland WL2N1",
      street: "Musterstraße 1",
      zip: "4020",
      city: "Linz",
      country: "AT",
      lat: 48.3069,
      lng: 14.2858,
      commissionedAt: new Date("2024-01-01T00:00:00.000Z"),
      connectionKw: 3.0,
      capacityKwh: 6.5,
    },
  });

  // Zuordnung Asset ↔ Weyland-Gerät (idempotent via @@id)
  await prisma.providerDeviceMapping.upsert({
    where: {
      provider_providerDeviceId: {
        provider: "WEYLAND",
        providerDeviceId: weylandDeviceSn,
      },
    },
    update: { assetId: asset.id },
    create: {
      provider: "WEYLAND",
      providerDeviceId: weylandDeviceSn,
      assetId: asset.id,
    },
  });

  // Flexibilitätsprofil (nur anlegen wenn noch keines existiert)
  const existingProfile = await prisma.assetFlexibilityProfile.findFirst({
    where: { assetId: asset.id },
  });

  if (!existingProfile) {
    await prisma.assetFlexibilityProfile.create({
      data: {
        assetId: asset.id,
        minPowerKw: -3.0,
        maxPowerKw: 3.0,
        minSocPercent: 20,
        maxSocPercent: 90,
        notes: "Demo-Flexibilitätsprofil für Bachelorarbeit",
      },
    });
  }

  console.log(`✅ Seed abgeschlossen. Asset-ID: ${asset.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });