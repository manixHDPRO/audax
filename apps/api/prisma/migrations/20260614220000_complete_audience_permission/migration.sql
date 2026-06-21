-- Confirmer la réception du visiteur (clôture audience)
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{COMPLETE_AUDIENCE}',
  '["ADMIN","SALLE_ATTENTE","PROTOCOL","SECRETAIRE"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
