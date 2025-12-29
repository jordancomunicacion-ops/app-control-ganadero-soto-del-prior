-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "altitude" REAL,
    "defaultManagementSystem" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subspecies" TEXT NOT NULL,
    "adultMaleWeight" REAL NOT NULL,
    "adultFemaleWeight" REAL NOT NULL,
    "refAdgFeedlot" REAL NOT NULL,
    "refAdgPasture" REAL NOT NULL,
    "refFcrFeedlot" REAL NOT NULL,
    "heatTolerance" REAL NOT NULL,
    "marblingPotential" INTEGER NOT NULL,
    "calvingEase" REAL NOT NULL,
    "source" TEXT
);

-- CreateTable
CREATE TABLE "Genotype" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "functionalType" TEXT NOT NULL,
    "motherBreedId" TEXT,
    "fatherBreedId" TEXT,
    "customAdg" REAL,
    "customFcr" REAL,
    CONSTRAINT "Genotype_motherBreedId_fkey" FOREIGN KEY ("motherBreedId") REFERENCES "Breed" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Genotype_fatherBreedId_fkey" FOREIGN KEY ("fatherBreedId") REFERENCES "Breed" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "genotypeId" TEXT NOT NULL,
    "motherId" TEXT,
    "fatherId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Animal_genotypeId_fkey" FOREIGN KEY ("genotypeId") REFERENCES "Genotype" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Animal_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Animal_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Animal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Weight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weightKg" REAL NOT NULL,
    "method" TEXT NOT NULL,
    CONSTRAINT "Weight_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dmPercent" REAL NOT NULL,
    "cpPercentDm" REAL NOT NULL,
    "fdnPercentDm" REAL NOT NULL,
    "adfPercentDm" REAL NOT NULL,
    "netEnergyMcalKgDm" REAL NOT NULL,
    "riskLevel" TEXT,
    "notes" TEXT,
    "costPerKgFresh" REAL NOT NULL,
    "source" TEXT
);

-- CreateTable
CREATE TABLE "Ration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "objective" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    CONSTRAINT "Ration_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rationId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "amountFreshKg" REAL NOT NULL,
    "amountDmKg" REAL,
    CONSTRAINT "RationItem_rationId_fkey" FOREIGN KEY ("rationId") REFERENCES "Ration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RationItem_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FarmDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "maxTemp" REAL,
    "minTemp" REAL,
    "humidity" REAL,
    "precipitation" REAL,
    "heatStressIndex" REAL,
    "notes" TEXT,
    CONSTRAINT "FarmDaily_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagementEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "ManagementEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ManagementEvent_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "functionalType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "minEnergy" REAL NOT NULL,
    "minProtein" REAL NOT NULL,
    "minFdn" REAL NOT NULL,
    "minConcentrate" REAL NOT NULL,
    "maxConcentrate" REAL NOT NULL,
    "refAdg" REAL NOT NULL,
    "refFcr" REAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "calculatedStage" TEXT NOT NULL,
    "totalDmKg" REAL NOT NULL,
    "dietEnergy" REAL NOT NULL,
    "dietProtein" REAL NOT NULL,
    "dietFdn" REAL NOT NULL,
    "dietAdf" REAL NOT NULL,
    "adgObserved" REAL,
    "fcrObserved" REAL,
    "adgPredicted" REAL,
    "fcrPredicted" REAL,
    CONSTRAINT "DailyMetric_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "Alert_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "qualityIndex" REAL NOT NULL,
    "predTenderness" REAL,
    "predMarbling" REAL,
    "predColor" TEXT,
    "confidence" REAL NOT NULL,
    "modelVersion" TEXT NOT NULL,
    CONSTRAINT "QualityPrediction_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraceabilityReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animalId" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    CONSTRAINT "TraceabilityReport_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

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
