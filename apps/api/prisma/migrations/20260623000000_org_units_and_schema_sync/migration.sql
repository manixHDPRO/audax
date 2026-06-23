-- Cabinets / bureaux + valeurs enum manquantes (aligné sur schema.prisma)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ASSISTANT';
ALTER TYPE "AudienceStatus" ADD VALUE IF NOT EXISTS 'CONFIRMEE';

CREATE TABLE IF NOT EXISTS "cabinets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cabinets_name_key" ON "cabinets"("name");

CREATE TABLE IF NOT EXISTS "bureaus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bureaus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bureaus_name_key" ON "bureaus"("name");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cabinetId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bureauId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_cabinetId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_cabinetId_fkey"
      FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_bureauId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_bureauId_fkey"
      FOREIGN KEY ("bureauId") REFERENCES "bureaus"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
