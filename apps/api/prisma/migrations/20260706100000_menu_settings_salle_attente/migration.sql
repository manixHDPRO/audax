-- Paramètres personnels : accès menu pour la salle d'attente (thème, sons, 2FA)
UPDATE "system_settings"
SET "value" = jsonb_set(
  COALESCE("value"::jsonb, '{}'::jsonb),
  '{MENU_SETTINGS}',
  '["ADMIN","CHEF","SECRETAIRE","PROTOCOL","CEMG","SALLE_ATTENTE","OBSERVATEUR","ASSISTANT"]'::jsonb
)::text
WHERE "key" = 'role_permissions';
