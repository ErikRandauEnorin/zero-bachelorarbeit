import "dotenv/config";

import {
  PrismaClient,
  ProviderType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} ist nicht gesetzt.`);
  }

  return value;
}

const connectionString =
  requireEnv("DATABASE_URL");

const weylandDeviceSn =
  requireEnv("WEYLAND_DEVICE_SN");

const heatSiteId =
  process.env.HEAT_SITE_ID ?? "auto";

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      name: "Demo-Energiecommunity",
    },
    update: {},
    create: {
      name: "Demo-Energiecommunity",
      type: "CUSTOMER",
    },
  });

  const weylandAsset =
    await prisma.asset.upsert({
      where: {
        tenantId_externalId: {
          tenantId: tenant.id,
          externalId:
            "demo-weyland-battery",
        },
      },
      update: {
        name: "Weyland Batteriespeicher",
        type: "BATTERY",
        manufacturer: "Weyland",
        model: "WL2N1",
        country: "AT",
        connectionKw: 3,
        capacityKwh: 6.5,
      },
      create: {
        tenantId: tenant.id,
        externalId:
          "demo-weyland-battery",
        name: "Weyland Batteriespeicher",
        type: "BATTERY",
        manufacturer: "Weyland",
        model: "WL2N1",
        country: "AT",
        connectionKw: 3,
        capacityKwh: 6.5,
      },
    });

  const heatAsset =
    await prisma.asset.upsert({
      where: {
        tenantId_externalId: {
          tenantId: tenant.id,
          externalId:
            "demo-heat-energy-system",
        },
      },
      update: {
        name: "HEAT Energiesystem",
        type: "ENERGY_SYSTEM",
        manufacturer: "HEAT",
        country: "DE",
      },
      create: {
        tenantId: tenant.id,
        externalId:
          "demo-heat-energy-system",
        name: "HEAT Energiesystem",
        type: "ENERGY_SYSTEM",
        manufacturer: "HEAT",
        country: "DE",
      },
    });

  await prisma.providerDeviceMapping.upsert({
    where: {
      provider_providerDeviceId: {
        provider: ProviderType.WEYLAND,
        providerDeviceId:
          weylandDeviceSn,
      },
    },
    update: {
      assetId: weylandAsset.id,
    },
    create: {
      provider: ProviderType.WEYLAND,
      providerDeviceId:
        weylandDeviceSn,
      assetId: weylandAsset.id,
    },
  });

  await prisma.providerDeviceMapping.upsert({
    where: {
      provider_providerDeviceId: {
        provider: ProviderType.HEAT,
        providerDeviceId: heatSiteId,
      },
    },
    update: {
      assetId: heatAsset.id,
    },
    create: {
      provider: ProviderType.HEAT,
      providerDeviceId: heatSiteId,
      assetId: heatAsset.id,
    },
  });

  const flexibilityProfile =
    await prisma.assetFlexibilityProfile.findFirst({
      where: {
        assetId: weylandAsset.id,
      },
    });

  if (!flexibilityProfile) {
    await prisma.assetFlexibilityProfile.create({
      data: {
        assetId: weylandAsset.id,
        minPowerKw: -3,
        maxPowerKw: 3,
        minSocPercent: 20,
        maxSocPercent: 90,
        rampUpMinutes: 2,
        rampDownMinutes: 2,
        minRuntimeMinutes: 5,
        notes:
          "Flexibilitätsprofil des Weyland-Demo-Assets",
      },
    });
  }

  console.log({
    tenantId: tenant.id,
    weylandAssetId: weylandAsset.id,
    heatAssetId: heatAsset.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });