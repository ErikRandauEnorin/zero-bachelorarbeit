-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "capacityKwh" DOUBLE PRECISION,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "commissionedAt" TIMESTAMP(3),
ADD COLUMN     "connectionKw" DOUBLE PRECISION,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zip" TEXT;
