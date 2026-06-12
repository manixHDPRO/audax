-- Rôle salle d'attente : enregistrement des audiences uniquement
ALTER TYPE "UserRole" ADD VALUE 'SALLE_ATTENTE';

-- Réappliquer la matrice par défaut pour CREATE_AUDIENCE (fusion code + base)
UPDATE "system_settings"
SET "value" = (value::jsonb - 'CREATE_AUDIENCE')::text
WHERE "key" = 'role_permissions';
