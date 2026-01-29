-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "dni" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "dob" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "defaultManagementSystem" TEXT,
    "municipio" TEXT,
    "municipioCode" TEXT,
    "provinciaCode" TEXT,
    "poligono" TEXT,
    "parcela" TEXT,
    "recintos" TEXT,
    "coords" TEXT,
    "superficie" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "license" TEXT,
    "maxHeads" INTEGER NOT NULL DEFAULT 0,
    "soilId" TEXT,
    "corrals" INTEGER NOT NULL DEFAULT 0,
    "corralNames" TEXT,
    "feedingSystem" TEXT,
    "slope" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subspecies" TEXT NOT NULL,
    "adultMaleWeight" DOUBLE PRECISION NOT NULL,
    "adultFemaleWeight" DOUBLE PRECISION NOT NULL,
    "refAdgFeedlot" DOUBLE PRECISION NOT NULL,
    "refAdgPasture" DOUBLE PRECISION NOT NULL,
    "refFcrFeedlot" DOUBLE PRECISION NOT NULL,
    "heatTolerance" DOUBLE PRECISION NOT NULL,
    "marblingPotential" INTEGER NOT NULL,
    "calvingEase" DOUBLE PRECISION NOT NULL,
    "milkPotential" INTEGER NOT NULL DEFAULT 1,
    "conformationPotential" INTEGER NOT NULL DEFAULT 3,
    "yieldPotential" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "source" TEXT,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genotype" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "functionalType" TEXT NOT NULL,
    "motherBreedId" TEXT,
    "fatherBreedId" TEXT,
    "customAdg" DOUBLE PRECISION,
    "customFcr" DOUBLE PRECISION,

    CONSTRAINT "Genotype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "genotypeId" TEXT NOT NULL,
    "motherId" TEXT,
    "fatherId" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "corral" TEXT,
    "category" TEXT,
    "breedName" TEXT,
    "currentWeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weight" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,

    CONSTRAINT "Weight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dmPercent" DOUBLE PRECISION NOT NULL,
    "cpPercentDm" DOUBLE PRECISION NOT NULL,
    "fdnPercentDm" DOUBLE PRECISION NOT NULL,
    "adfPercentDm" DOUBLE PRECISION NOT NULL,
    "netEnergyMcalKgDm" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT,
    "notes" TEXT,
    "costPerKgFresh" DOUBLE PRECISION NOT NULL,
    "source" TEXT,

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ration" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "objective" TEXT NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "Ration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RationItem" (
    "id" TEXT NOT NULL,
    "rationId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "amountFreshKg" DOUBLE PRECISION NOT NULL,
    "amountDmKg" DOUBLE PRECISION,

    CONSTRAINT "RationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmDaily" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "maxTemp" DOUBLE PRECISION,
    "minTemp" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "heatStressIndex" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "FarmDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementEvent" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "eventData" TEXT,
    "notes" TEXT,

    CONSTRAINT "ManagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "functionalType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "minEnergy" DOUBLE PRECISION NOT NULL,
    "minProtein" DOUBLE PRECISION NOT NULL,
    "minFdn" DOUBLE PRECISION NOT NULL,
    "minConcentrate" DOUBLE PRECISION NOT NULL,
    "maxConcentrate" DOUBLE PRECISION NOT NULL,
    "refAdg" DOUBLE PRECISION NOT NULL,
    "refFcr" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "calculatedStage" TEXT NOT NULL,
    "totalDmKg" DOUBLE PRECISION NOT NULL,
    "dietEnergy" DOUBLE PRECISION NOT NULL,
    "dietProtein" DOUBLE PRECISION NOT NULL,
    "dietFdn" DOUBLE PRECISION NOT NULL,
    "dietAdf" DOUBLE PRECISION NOT NULL,
    "adgObserved" DOUBLE PRECISION,
    "fcrObserved" DOUBLE PRECISION,
    "adgPredicted" DOUBLE PRECISION,
    "fcrPredicted" DOUBLE PRECISION,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityPrediction" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "qualityIndex" DOUBLE PRECISION NOT NULL,
    "predTenderness" DOUBLE PRECISION,
    "predMarbling" DOUBLE PRECISION,
    "predColor" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,

    CONSTRAINT "QualityPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceabilityReport" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,

    CONSTRAINT "TraceabilityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Weight_animalId_date_key" ON "Weight"("animalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Ration_animalId_date_key" ON "Ration"("animalId", "date");

-- CreateIndex
CREATE INDEX "RationItem_rationId_idx" ON "RationItem"("rationId");

-- CreateIndex
CREATE INDEX "RationItem_feedId_idx" ON "RationItem"("feedId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmDaily_farmId_date_key" ON "FarmDaily"("farmId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_animalId_date_key" ON "DailyMetric"("animalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TraceabilityReport_qrToken_key" ON "TraceabilityReport"("qrToken");

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Genotype" ADD CONSTRAINT "Genotype_motherBreedId_fkey" FOREIGN KEY ("motherBreedId") REFERENCES "Breed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Genotype" ADD CONSTRAINT "Genotype_fatherBreedId_fkey" FOREIGN KEY ("fatherBreedId") REFERENCES "Breed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_genotypeId_fkey" FOREIGN KEY ("genotypeId") REFERENCES "Genotype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weight" ADD CONSTRAINT "Weight_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_rationId_fkey" FOREIGN KEY ("rationId") REFERENCES "Ration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmDaily" ADD CONSTRAINT "FarmDaily_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementEvent" ADD CONSTRAINT "ManagementEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementEvent" ADD CONSTRAINT "ManagementEvent_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityPrediction" ADD CONSTRAINT "QualityPrediction_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityReport" ADD CONSTRAINT "TraceabilityReport_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
