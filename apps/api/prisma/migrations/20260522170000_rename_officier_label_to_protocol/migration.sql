-- Renommer le libellé du rôle OFFICIER en base (si déjà personnalisé)
UPDATE "system_settings"
SET value = REPLACE(
  REPLACE(value, '"Officier validation"', '"Protocol"'),
  '"Officier de validation"',
  '"Protocol"'
)
WHERE key = 'role_labels'
  AND (value LIKE '%Officier validation%' OR value LIKE '%Officier de validation%');
