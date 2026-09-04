module.exports = {
  apps: [
    {
      name: "gerenciador",
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3002 -H 0.0.0.0",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
      exp_backoff_restart_delay: 100,
      min_uptime: "10s",
      max_restarts: 20,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};
