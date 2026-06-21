-- Enregistrement des visiteurs par la salle d'attente
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{REGISTER_VISITOR}',
  '["ADMIN","SALLE_ATTENTE"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
