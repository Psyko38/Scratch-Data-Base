const path = require('node:path');
const rootDir = path.resolve(__dirname, '../../');
require('dotenv').config({ path: path.join(rootDir, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const rawBasePath = (process.env.BASE_PATH || '').trim();
const basePath = rawBasePath ? '/' + rawBasePath.replace(/^\/+|\/+$/g, '') : '';

const rawDbPath = process.env.DATABASE_PATH || './data/scratch_ai_detector.db';
const databasePath = rawDbPath === ':memory:'
  ? ':memory:'
  : (path.isAbsolute(rawDbPath) ? rawDbPath : path.resolve(rootDir, rawDbPath));

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  basePath,
  databasePath,
  jwtSecret: process.env.JWT_SECRET || 'cao-scratch-ai-detector-secret-key-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'cao_admin_token',
  adminDefaultUsername: process.env.ADMIN_USERNAME || 'admin',
  adminDefaultPassword: process.env.ADMIN_PASSWORD || 'AdminPass123!',
  minVotesForVerdict: 5,
  corsOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
};
