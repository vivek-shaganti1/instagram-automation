module.exports = {
  apps: [
    {
      name: "instagram-automation-api",
      script: "./dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env_production: {
        NODE_ENV: "production",
        PORT: 8000
      },
      error_file: "./logs/pm2_err.log",
      out_file: "./logs/pm2_out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
