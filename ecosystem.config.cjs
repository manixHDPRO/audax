/** PM2 — déploiement VPS sans Docker (monorepo npm workspaces) */
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
      // next est hoisté à la racine du monorepo, pas dans apps/web/node_modules
      script: '../../node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
