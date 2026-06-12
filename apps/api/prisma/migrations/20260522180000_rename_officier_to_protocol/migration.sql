-- Renomme le rôle système OFFICIER en PROTOCOL
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'OFFICIER' THEN 'PROTOCOL'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'OBSERVATEUR'::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Matrice des permissions
UPDATE "system_settings"
SET "value" = REPLACE("value", '"OFFICIER"', '"PROTOCOL"')
WHERE "key" = 'role_permissions';

-- Libellés et descriptions des rôles
UPDATE "system_settings"
SET "value" = REPLACE(
  REPLACE(
    REPLACE("value", '"OFFICIER":', '"PROTOCOL":'),
    '"Officier validation"',
    '"Protocol"'
  ),
  '"Officier de validation"',
  '"Protocol"'
)
WHERE "key" IN ('role_labels', 'role_descriptions');

-- Supprimer un éventuel rôle personnalisé PROTOCOL devenu rôle système
UPDATE "system_settings"
SET "value" = COALESCE(
  (
    SELECT json_agg(elem)::text
    FROM (
      SELECT elem
      FROM json_array_elements("value"::json) AS elem
      WHERE elem->>'code' <> 'PROTOCOL'
    ) AS filtered
  ),
  '[]'
)
WHERE "key" = 'custom_roles'
  AND "value" LIKE '%PROTOCOL%';
