module.exports = {
  apps: [
    {
      name: 'whatsapp-agent',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '850M',
      restart_delay: 4000,
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/agent-error.log',
      out_file: './logs/agent-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
