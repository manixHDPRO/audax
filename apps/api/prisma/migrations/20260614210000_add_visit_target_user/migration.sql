-- Personne à voir (utilisateur interne) sur une demande d'audience
ALTER TABLE "audiences" ADD COLUMN "visitTargetUserId" TEXT;

ALTER TABLE "audiences" ADD CONSTRAINT "audiences_visitTargetUserId_fkey"
  FOREIGN KEY ("visitTargetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audiences_visitTargetUserId_idx" ON "audiences"("visitTargetUserId");
