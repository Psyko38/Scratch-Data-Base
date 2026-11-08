const app = require('./src/app');
const config = require('./src/config');

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Cao AI Detector Backend running on port ${config.port}`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`📊 Admin Dashboard: http://localhost:${config.port}/admin`);
  console.log(`🩺 Health check: http://localhost:${config.port}/api/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
