/*
  Warnings:

  - A unique constraint covering the columns `[assetId,measurementType,observedAt,sourceProvider,sourceRef]` on the table `AssetMeasurement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "asset_measurement_source_unique" ON "AssetMeasurement"("assetId", "measurementType", "observedAt", "sourceProvider", "sourceRef");
