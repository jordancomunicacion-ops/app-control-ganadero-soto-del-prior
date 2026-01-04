-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "stripePaymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "ResBooking" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "ResBooking" ADD COLUMN "stripePaymentMethodId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RatePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "cancellationPolicy" TEXT,
    "mealsIncluded" TEXT,
    "requireCreditCard" BOOLEAN NOT NULL DEFAULT false,
    "noShowFee" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "RatePlan_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RatePlan" ("cancellationPolicy", "description", "hotelId", "id", "isDefault", "mealsIncluded", "name") SELECT "cancellationPolicy", "description", "hotelId", "id", "isDefault", "mealsIncluded", "name" FROM "RatePlan";
DROP TABLE "RatePlan";
ALTER TABLE "new_RatePlan" RENAME TO "RatePlan";
CREATE TABLE "new_ResPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cancelHours" INTEGER NOT NULL,
    "noShowFee" DECIMAL NOT NULL DEFAULT 0,
    "requireCreditCard" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_ResPolicy" ("cancelHours", "id", "isActive", "name", "noShowFee") SELECT "cancelHours", "id", "isActive", "name", "noShowFee" FROM "ResPolicy";
DROP TABLE "ResPolicy";
ALTER TABLE "new_ResPolicy" RENAME TO "ResPolicy";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
