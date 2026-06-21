-- Confirmation réception : réservée au Protocol (et Admin)
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{COMPLETE_AUDIENCE}',
  '["ADMIN","PROTOCOL"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
