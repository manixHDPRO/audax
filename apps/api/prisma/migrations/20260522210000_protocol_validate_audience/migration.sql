-- Protocol : valider et reprogrammer les audiences (aligné sur permissions.ts)
UPDATE "system_settings"
SET "value" = jsonb_set(
  jsonb_set(
    "value"::jsonb,
    '{VALIDATE_AUDIENCE}',
    '["ADMIN","CHEF","PROTOCOL","CEMG"]'::jsonb
  ),
  '{PLANIFY}',
  '["ADMIN","CHEF","SECRETAIRE","PROTOCOL","CEMG"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
