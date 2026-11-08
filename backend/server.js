const app = require('./src/app');
const config = require('./src/config');
const db = require('./src/db/database');

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Scratch AI Backend running on port ${config.port}`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`📊 Dashboard & Explorer: http://localhost:${config.port}`);
  console.log(`🩺 Health check: http://localhost:${config.port}/api/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
function shutdown(signal) {
  console.log(`\n${signal} signal received: closing HTTP server and database...`);
  server.close(() => {
    try {
      db.close();
      console.log('Database connection closed cleanly.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    console.log('HTTP server closed. Exiting.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
