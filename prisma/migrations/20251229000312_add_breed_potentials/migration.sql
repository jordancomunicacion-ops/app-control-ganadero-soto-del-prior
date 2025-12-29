-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Breed" (
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
    "milkPotential" INTEGER NOT NULL DEFAULT 1,
    "conformationPotential" INTEGER NOT NULL DEFAULT 3,
    "yieldPotential" REAL NOT NULL DEFAULT 0.55,
    "source" TEXT
);
INSERT INTO "new_Breed" ("adultFemaleWeight", "adultMaleWeight", "calvingEase", "heatTolerance", "id", "marblingPotential", "name", "refAdgFeedlot", "refAdgPasture", "refFcrFeedlot", "source", "subspecies") SELECT "adultFemaleWeight", "adultMaleWeight", "calvingEase", "heatTolerance", "id", "marblingPotential", "name", "refAdgFeedlot", "refAdgPasture", "refFcrFeedlot", "source", "subspecies" FROM "Breed";
DROP TABLE "Breed";
ALTER TABLE "new_Breed" RENAME TO "Breed";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
