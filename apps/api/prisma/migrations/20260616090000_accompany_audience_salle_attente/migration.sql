-- Accompagnement des audiences validées par la salle d'attente
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{ACCOMPANY_AUDIENCE}',
  '["ADMIN","SALLE_ATTENTE"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
