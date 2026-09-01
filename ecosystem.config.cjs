module.exports = {
  apps: [
    {
      name: 'reelpilot',
      cwd: '/var/www/codebyjawad.com/reelpilot',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'api/server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/reelpilot-error.log',
      out_file: '/root/.pm2/logs/reelpilot-out.log',
      merge_logs: true,
    },
  ],
};
