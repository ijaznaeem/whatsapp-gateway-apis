module.exports = {
  apps: [
    {
      name: 'whatsapp-api-gateway',
      script: 'src/index.js',
      cwd: '/opt/whatsapp-api-gateway',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/whatsapp-api-gateway-error.log',
      out_file: '/var/log/pm2/whatsapp-api-gateway-out.log',
      log_file: '/var/log/pm2/whatsapp-api-gateway-combined.log',
      time: true
    }
  ]
};
