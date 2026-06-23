-- Délégation CEMG → DirCab : la personne à voir devient le Chef de Cabinet
UPDATE "audiences" AS a
SET "visitTargetUserId" = sub.chef_id
FROM (
  SELECT
    a2.id AS audience_id,
    COALESCE(
      (
        SELECT c.id
        FROM "users" AS c
        WHERE c.role = 'CHEF'
          AND c."isActive" = true
          AND c."cabinetId" = vt."cabinetId"
        LIMIT 1
      ),
      (
        SELECT c.id
        FROM "users" AS c
        WHERE c.role = 'CHEF'
          AND c."isActive" = true
        LIMIT 1
      )
    ) AS chef_id
  FROM "audiences" AS a2
  INNER JOIN "users" AS vt ON vt.id = a2."visitTargetUserId"
  WHERE a2.status = 'TRANSMIS_DIRCAB'
    AND vt.role = 'CEMG'
) AS sub
WHERE a.id = sub.audience_id
  AND sub.chef_id IS NOT NULL;
