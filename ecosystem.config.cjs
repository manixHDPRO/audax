/** PM2 — déploiement VPS sans Docker (monorepo npm workspaces) */
const webPort = Number(process.env.AUDAX_WEB_PORT || 3000);

module.exports = {
  apps: [
    {
      name: 'audax-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        API_PORT: 4000,
      },
    },
    {
      name: 'audax-web',
      cwd: './apps/web',
      // PM2 ne doit pas exécuter le wrapper shell .bin/next (interpreter: none).
      script: '../../node_modules/next/dist/bin/next',
      args: `start -p ${webPort} -H 0.0.0.0`,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: webPort,
      },
    },
  ],
};
