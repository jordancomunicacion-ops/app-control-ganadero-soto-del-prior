-- Sprint 6: Bienestar animal (Welfare Quality® / Welfair / B+ PAWS)

CREATE TABLE "WelfareAssessment" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "protocol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'preparando',
    "auditorName" TEXT,
    "overallScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfareAssessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WelfareAssessment_farmId_idx" ON "WelfareAssessment"("farmId");
CREATE INDEX "WelfareAssessment_farmId_date_idx" ON "WelfareAssessment"("farmId", "date");

ALTER TABLE "WelfareAssessment" ADD CONSTRAINT "WelfareAssessment_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WelfareIndicator" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "principle" INTEGER NOT NULL,
    "criterion" TEXT NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "valueNumeric" DOUBLE PRECISION,
    "valueText" TEXT,
    "valueBool" BOOLEAN,
    "score" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'sin_dato',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfareIndicator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WelfareIndicator_assessmentId_indicatorCode_key" ON "WelfareIndicator"("assessmentId", "indicatorCode");
CREATE INDEX "WelfareIndicator_assessmentId_idx" ON "WelfareIndicator"("assessmentId");
CREATE INDEX "WelfareIndicator_assessmentId_principle_idx" ON "WelfareIndicator"("assessmentId", "principle");

ALTER TABLE "WelfareIndicator" ADD CONSTRAINT "WelfareIndicator_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "WelfareAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
