const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../..');
const rootEnv = path.join(rootDir, '.env');
const rootEnvLocal = path.join(rootDir, '.env.local');

require('dotenv').config({ path: rootEnv });
require('dotenv').config({ path: rootEnvLocal, override: true });

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
