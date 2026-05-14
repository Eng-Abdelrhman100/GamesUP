module.exports = {
  apps: [
    {
      name: 'gamesup-api',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
