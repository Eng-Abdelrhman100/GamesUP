module.exports = {
  apps: [
    {
      name: 'gamesup-api',
      script: 'server/server.js',
      autorestart: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 1000,
      max_restarts: 15,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
