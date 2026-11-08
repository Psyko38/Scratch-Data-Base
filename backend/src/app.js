const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const config = require('./config');
const db = require('./db/database');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize database schema and admin account
db.init();

const app = express();

// Trust reverse proxies if in production
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration supporting Chrome Extensions and web clients
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, extensions in some contexts)
    // or from chrome-extension:// origins
    if (!origin || origin.startsWith('chrome-extension://') || config.corsOrigins === '*' || (Array.isArray(config.corsOrigins) && config.corsOrigins.includes(origin))) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for API consumers
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static community explorer assets (Unified public & admin page)
app.use(express.static(path.resolve(__dirname, '../public/explorer')));

// Apply general rate limiting to API routes
app.use('/api', apiLimiter);

// Register routes
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/projects'));
app.use('/api', require('./routes/votes'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/publicStats'));
app.use('/api/admin', require('./routes/admin'));

// Community Explorer Page (Also serves unified Admin User Management view)
app.get(['/', '/explore', '/explore/', '/admin', '/admin/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/explorer/index.html'));
});

// JSON info route
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Cao AI Detector API',
    description: 'Centralized backend service for Scratch AI Detector Chrome Extension',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
      communityStats: '/api/stats',
      projectStats: '/api/projects/:projectId',
      submitVote: 'POST /api/votes',
      userVotes: '/api/users/:userId/votes',
      publicCsvExport: '/api/export/csv?type=votes|projects',
      communityExplorer: '/',
      adminDashboard: '/admin'
    }
  });
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
