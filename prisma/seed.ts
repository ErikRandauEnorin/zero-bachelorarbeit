// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} ist nicht gesetzt.`);
  }

  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const weylandDeviceSn = requireEnv("WEYLAND_DEVICE_SN");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Demo-Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo-Energiecommunity',
      type: 'CUSTOMER',
    },
  });

  // Demo-Asset, z.B. Batteriespeicher
  const asset = await prisma.asset.create({
    data: {
      externalId: 'weyland-device-1',
      name: 'Demo-Speicher Weyland',
      type: 'BATTERY',
      tenantId: tenant.id,
    },
  });

  // Zuordnung Asset ↔ Weyland-Gerät
  await prisma.providerDeviceMapping.create({
    data: {
      provider: 'WEYLAND',
      providerDeviceId: weylandDeviceSn, // clientId/sn o.Ä.
      assetId: asset.id,
    },
  });

  // Einfaches Flexibilitätsprofil für dieses Asset
  await prisma.assetFlexibilityProfile.create({
    data: {
      assetId: asset.id,
      minPowerKw: -3.0,
      maxPowerKw: 3.0,
      minSocPercent: 20,
      maxSocPercent: 90,
      notes: 'Demo-Flexibilitätsprofil für Bachelorarbeit',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });