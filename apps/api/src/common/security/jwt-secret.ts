const WEAK_EXACT = new Set([
  'dev-secret',
  'secret',
  'password',
  'changeme',
  'change-me',
  'jwt_secret',
]);

const WEAK_SUBSTRINGS = [
  'change-me',
  'changeme',
  'generate-a-long',
  'your-secret',
  'replace_with_',
  'dev-secret',
  'paste-openssl',
  'output-here',
];

const MIN_PROD_LENGTH = 32;

/**
 * Résout JWT_SECRET. En production : refuse absence, secrets trop courts ou placeholders.
 * En développement : autorise un fallback local avec avertissement console.
 */
export function resolveJwtSecret(
  secret: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const isProduction = nodeEnv === 'production';
  const value = secret?.trim() ?? '';

  if (!value) {
    if (isProduction) {
      throw new Error(
        'JWT_SECRET est obligatoire en production. Générez une valeur aléatoire ≥ 32 caractères.',
      );
    }
    console.warn(
      '[AUDAX] JWT_SECRET manquant — fallback développement uniquement. Ne jamais déployer ainsi.',
    );
    return 'dev-secret';
  }

  if (isProduction) {
    assertProductionJwtSecret(value);
  }

  return value;
}

export function assertProductionJwtSecret(secret: string): void {
  if (secret.length < MIN_PROD_LENGTH) {
    throw new Error(
      `JWT_SECRET trop court (${secret.length} < ${MIN_PROD_LENGTH}). Utilisez une chaîne aléatoire forte.`,
    );
  }

  const lower = secret.toLowerCase();
  if (WEAK_EXACT.has(lower) || WEAK_SUBSTRINGS.some((pattern) => lower.includes(pattern))) {
    throw new Error(
      'JWT_SECRET ressemble à un placeholder faible. Remplacez-le avant le démarrage en production.',
    );
  }
}
