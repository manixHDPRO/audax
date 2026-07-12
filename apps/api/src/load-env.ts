import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/** Charge .env racine monorepo + apps/api (même ordre de priorité que ConfigModule). */
export function loadRootEnv(): void {
  const cwd = process.cwd();
  const paths = [
    join(cwd, '.env'),
    join(cwd, '../../.env'),
    join(cwd, '.env.local'),
    join(cwd, '../../.env.local'),
  ];

  for (const envPath of paths) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: true });
    }
  }
}
