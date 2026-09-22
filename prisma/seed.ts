// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL ist nicht gesetzt.');
}

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
      providerDeviceId: 'DEIN_WEYLAND_DEVICE_ID', // clientId/sn o.Ä.
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