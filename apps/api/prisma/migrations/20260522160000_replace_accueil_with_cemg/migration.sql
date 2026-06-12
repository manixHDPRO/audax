-- Remplace ACCUEIL par CEMG (Chef d'état major général)
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CHEF', 'SECRETAIRE', 'OFFICIER', 'CEMG', 'OBSERVATEUR');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'ACCUEIL' THEN 'CEMG'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'OBSERVATEUR'::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Matrice des permissions : ACCUEIL -> CEMG
UPDATE "system_settings"
SET "value" = REPLACE("value", '"ACCUEIL"', '"CEMG"')
WHERE "key" = 'role_permissions';

-- Supprimer le rôle personnalisé CEMG devenu rôle système
UPDATE "system_settings"
SET "value" = COALESCE(
  (
    SELECT json_agg(elem)::text
    FROM (
      SELECT elem
      FROM json_array_elements("value"::json) AS elem
      WHERE elem->>'code' <> 'CEMG'
    ) AS filtered
  ),
  '[]'
)
WHERE "key" = 'custom_roles'
  AND "value" LIKE '%CEMG%';
