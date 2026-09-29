-- CreateEnum
CREATE TYPE "MeasurementQuality" AS ENUM ('VALID', 'ESTIMATED', 'MISSING');

-- AlterTable
ALTER TABLE "AssetFlexibilityProfile" ADD COLUMN     "minRuntimeMinutes" INTEGER,
ADD COLUMN     "rampDownMinutes" INTEGER,
ADD COLUMN     "rampUpMinutes" INTEGER;

-- AlterTable
ALTER TABLE "AssetMeasurement" ADD COLUMN     "quality" "MeasurementQuality" NOT NULL DEFAULT 'VALID';
