-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('NEOOM', 'OLI', 'WEYLAND', 'SIGEN', 'HEAT');

-- CreateTable
CREATE TABLE "ProviderDeviceMapping" (
    "provider" "ProviderType" NOT NULL,
    "providerDeviceId" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderDeviceMapping_pkey" PRIMARY KEY ("provider","providerDeviceId")
);

-- CreateTable
CREATE TABLE "AssetMeasurement" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "measurementType" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sourceProvider" "ProviderType",
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFlexibilityProfile" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "minPowerKw" DOUBLE PRECISION,
    "maxPowerKw" DOUBLE PRECISION,
    "minSocPercent" DOUBLE PRECISION,
    "maxSocPercent" DOUBLE PRECISION,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetFlexibilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderDeviceMapping_assetId_idx" ON "ProviderDeviceMapping"("assetId");

-- CreateIndex
CREATE INDEX "AssetMeasurement_assetId_measurementType_observedAt_idx" ON "AssetMeasurement"("assetId", "measurementType", "observedAt");

-- CreateIndex
CREATE INDEX "AssetFlexibilityProfile_assetId_idx" ON "AssetFlexibilityProfile"("assetId");

-- AddForeignKey
ALTER TABLE "ProviderDeviceMapping" ADD CONSTRAINT "ProviderDeviceMapping_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMeasurement" ADD CONSTRAINT "AssetMeasurement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFlexibilityProfile" ADD CONSTRAINT "AssetFlexibilityProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
