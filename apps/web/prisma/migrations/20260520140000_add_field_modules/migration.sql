-- Sprint 0: cimientos para sanidad, hoja de vida, pastoreo, costes,
-- huella IPCC, simulaciones y alertas configurables.

-- AlterTable: Animal — DIB español + foto principal
ALTER TABLE "Animal" ADD COLUMN     "dibCode" TEXT,
ADD COLUMN     "photoUrl" TEXT;

CREATE UNIQUE INDEX "Animal_dibCode_key" ON "Animal"("dibCode");

-- CreateTable: AnimalAttachment (fotos / ecografías / docs / notas)
CREATE TABLE "AnimalAttachment" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnimalAttachment_animalId_idx" ON "AnimalAttachment"("animalId");
CREATE INDEX "AnimalAttachment_animalId_type_idx" ON "AnimalAttachment"("animalId", "type");

ALTER TABLE "AnimalAttachment" ADD CONSTRAINT "AnimalAttachment_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: VetProduct (vademécum local)
CREATE TABLE "VetProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "category" TEXT NOT NULL,
    "presentation" TEXT,
    "withdrawalMeatDays" INTEGER NOT NULL DEFAULT 0,
    "withdrawalMilkDays" INTEGER NOT NULL DEFAULT 0,
    "aemspCode" TEXT,
    "presvetCode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ml',
    "defaultDosePerKg" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VetProduct_category_idx" ON "VetProduct"("category");
CREATE INDEX "VetProduct_name_idx" ON "VetProduct"("name");

-- CreateTable: HealthRecord (eventos sanitarios)
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productId" TEXT,
    "diagnosis" TEXT,
    "dose" DOUBLE PRECISION,
    "doseUnit" TEXT,
    "route" TEXT,
    "vetName" TEXT,
    "prescriptionRef" TEXT,
    "campaignId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "withdrawalMeatUntil" TIMESTAMP(3),
    "withdrawalMilkUntil" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthRecord_animalId_idx" ON "HealthRecord"("animalId");
CREATE INDEX "HealthRecord_animalId_appliedAt_idx" ON "HealthRecord"("animalId", "appliedAt");
CREATE INDEX "HealthRecord_productId_idx" ON "HealthRecord"("productId");
CREATE INDEX "HealthRecord_campaignId_idx" ON "HealthRecord"("campaignId");
CREATE INDEX "HealthRecord_withdrawalMeatUntil_idx" ON "HealthRecord"("withdrawalMeatUntil");

-- CreateTable: VetStockMovement (kardex)
CREATE TABLE "VetStockMovement" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VetStockMovement_farmId_idx" ON "VetStockMovement"("farmId");
CREATE INDEX "VetStockMovement_farmId_productId_idx" ON "VetStockMovement"("farmId", "productId");
CREATE INDEX "VetStockMovement_occurredAt_idx" ON "VetStockMovement"("occurredAt");

-- CreateTable: CampaignSchedule (saneamientos)
CREATE TABLE "CampaignSchedule" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "vetName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignSchedule_farmId_idx" ON "CampaignSchedule"("farmId");
CREATE INDEX "CampaignSchedule_farmId_scheduledFor_idx" ON "CampaignSchedule"("farmId", "scheduledFor");

-- FKs sanitarias
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "VetProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "CampaignSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VetStockMovement" ADD CONSTRAINT "VetStockMovement_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VetStockMovement" ADD CONSTRAINT "VetStockMovement_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "VetProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignSchedule" ADD CONSTRAINT "CampaignSchedule_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GrazingEvent (pastoreo × parcela)
CREATE TABLE "GrazingEvent" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "corralId" TEXT,
    "cropPlotId" TEXT,
    "sigpacRef" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "areaHa" DOUBLE PRECISION,
    "lu" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrazingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrazingEvent_farmId_idx" ON "GrazingEvent"("farmId");
CREATE INDEX "GrazingEvent_farmId_startAt_idx" ON "GrazingEvent"("farmId", "startAt");
CREATE INDEX "GrazingEvent_animalId_idx" ON "GrazingEvent"("animalId");
CREATE INDEX "GrazingEvent_corralId_idx" ON "GrazingEvent"("corralId");
CREATE INDEX "GrazingEvent_cropPlotId_idx" ON "GrazingEvent"("cropPlotId");

ALTER TABLE "GrazingEvent" ADD CONSTRAINT "GrazingEvent_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrazingEvent" ADD CONSTRAINT "GrazingEvent_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: EmissionRecord (huella IPCC)
CREATE TABLE "EmissionRecord" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "headcount" DOUBLE PRECISION NOT NULL,
    "lu" DOUBLE PRECISION NOT NULL,
    "ch4Enteric" DOUBLE PRECISION NOT NULL,
    "ch4Manure" DOUBLE PRECISION NOT NULL,
    "n2oManure" DOUBLE PRECISION NOT NULL,
    "n2oSoil" DOUBLE PRECISION NOT NULL,
    "co2eqTotal" DOUBLE PRECISION NOT NULL,
    "liveWeightKg" DOUBLE PRECISION,
    "carcassKg" DOUBLE PRECISION,
    "intensityPerKgLive" DOUBLE PRECISION,
    "intensityPerKgCarcass" DOUBLE PRECISION,
    "methodology" TEXT NOT NULL DEFAULT 'IPCC2019_Tier1',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmissionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmissionRecord_farmId_idx" ON "EmissionRecord"("farmId");
CREATE INDEX "EmissionRecord_farmId_periodFrom_idx" ON "EmissionRecord"("farmId", "periodFrom");

ALTER TABLE "EmissionRecord" ADD CONSTRAINT "EmissionRecord_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Simulation (¿qué pasaría si?)
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "createdBy" TEXT,
    "name" TEXT NOT NULL,
    "baselineJson" TEXT NOT NULL,
    "scenarioJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Simulation_farmId_idx" ON "Simulation"("farmId");
CREATE INDEX "Simulation_farmId_createdAt_idx" ON "Simulation"("farmId", "createdAt");

ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CostEntry (libro de costes)
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CostEntry_farmId_idx" ON "CostEntry"("farmId");
CREATE INDEX "CostEntry_farmId_date_idx" ON "CostEntry"("farmId", "date");
CREATE INDEX "CostEntry_animalId_idx" ON "CostEntry"("animalId");

ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AlertRule (reglas configurables)
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "paramsJson" TEXT NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "channels" TEXT[] NOT NULL DEFAULT ARRAY['app']::TEXT[],
    "lastEvalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertRule_farmId_kind_key" ON "AlertRule"("farmId", "kind");
CREATE INDEX "AlertRule_farmId_idx" ON "AlertRule"("farmId");

ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
