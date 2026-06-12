const path = require('path');
const { spawnSync } = require('child_process');

const rootEnv = path.resolve(__dirname, '../../..', '.env');
require('dotenv').config({ path: rootEnv });

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
