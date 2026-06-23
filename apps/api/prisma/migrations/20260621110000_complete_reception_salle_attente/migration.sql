-- Confirmation réception : salle d'attente (hors audiences CEMG) + Protocol + Admin
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{COMPLETE_AUDIENCE}',
  '["ADMIN","PROTOCOL","SALLE_ATTENTE"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
