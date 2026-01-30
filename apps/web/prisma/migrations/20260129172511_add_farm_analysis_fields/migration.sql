-- AlterTable
ALTER TABLE "Farm" ADD COLUMN     "breedsRecommendation" TEXT,
ADD COLUMN     "climateStudy" TEXT,
ADD COLUMN     "cropsRecommendation" TEXT,
ADD COLUMN     "f1Recommendation" TEXT,
ADD COLUMN     "irrigationCoef" DOUBLE PRECISION NOT NULL DEFAULT 0;
