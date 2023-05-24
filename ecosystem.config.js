module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/main.js",
      instances: 3,
      exec_mode: "cluster",
      watch: false,
      autorestart: true,
      env: {
        DEBUG: "sado-*",
      }
    },
    {
      name: "worker",
      script: "dist/worker.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "*/5 * * * *",
      watch: false,
      autorestart: false,
      env: {
        DEBUG: "sado-*",
      }
    }
  ]
};