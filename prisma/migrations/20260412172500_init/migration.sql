-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."NeoomEnergyFlowSnapshot" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "powerConsumption" DOUBLE PRECISION,
    "powerProduction" DOUBLE PRECISION,
    "powerStorage" DOUBLE PRECISION,
    "powerGrid" DOUBLE PRECISION,
    "stateOfCharge" DOUBLE PRECISION,
    "selfSufficiency" DOUBLE PRECISION,
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeoomEnergyFlowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NeoomSiteSnapshot" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "electricityPrice" DOUBLE PRECISION,
    "hasProducer" BOOLEAN,
    "hasStorage" BOOLEAN,
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoomSiteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OliRawTelemetrySnapshot" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3),
    "outdoorTempC" DOUBLE PRECISION,
    "indoorTempC" DOUBLE PRECISION,
    "flowTempC" DOUBLE PRECISION,
    "returnTempC" DOUBLE PRECISION,
    "targetFlowTempC" DOUBLE PRECISION,
    "compressorPowerKw" DOUBLE PRECISION,
    "auxHeaterPowerKw" DOUBLE PRECISION,
    "totalPowerKw" DOUBLE PRECISION,
    "cop" DOUBLE PRECISION,
    "mode" TEXT,
    "opState" TEXT,
    "elecEnergyKwhTotal" DOUBLE PRECISION,
    "thermalEnergyKwhTotal" DOUBLE PRECISION,
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OliRawTelemetrySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OliTelemetry15mSnapshot" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3),
    "sampleCount" INTEGER,
    "sumOutdoorTempC" DOUBLE PRECISION,
    "sumIndoorTempC" DOUBLE PRECISION,
    "sumFlowTempC" DOUBLE PRECISION,
    "sumReturnTempC" DOUBLE PRECISION,
    "sumTotalPowerKw" DOUBLE PRECISION,
    "sumCop" DOUBLE PRECISION,
    "minOutdoorTempC" DOUBLE PRECISION,
    "maxOutdoorTempC" DOUBLE PRECISION,
    "minIndoorTempC" DOUBLE PRECISION,
    "maxIndoorTempC" DOUBLE PRECISION,
    "minTotalPowerKw" DOUBLE PRECISION,
    "maxTotalPowerKw" DOUBLE PRECISION,
    "lastMode" TEXT,
    "lastOpState" TEXT,
    "lastTs" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OliTelemetry15mSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeoomSiteSnapshot_siteId_key" ON "public"."NeoomSiteSnapshot"("siteId" ASC);

