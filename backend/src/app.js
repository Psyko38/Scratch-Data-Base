const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const { getExtensionHash, syncVersionFile } = require('./utils/versionHash');

// Initialize database schema, admin account, and extension version hash
db.init();
syncVersionFile();

const app = express();

// Trust reverse proxies (Alwaysdata, Nginx, Docker, Cloudflare, etc.)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration supporting Chrome Extensions and web clients
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://') || config.corsOrigins === '*' || (Array.isArray(config.corsOrigins) && config.corsOrigins.includes(origin))) {
      callback(null, true);
    } else {
      callback(null, true);
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

// Subpath & Reverse Proxy handler (Supports subroutes like https://matteobanzet.alwaysdata.net/scratch-ai)
const configuredBasePath = config.basePath || '';

app.use((req, res, next) => {
  const forwardedPrefix = (req.headers['x-forwarded-prefix'] || '').trim().replace(/\/+$/, '');
  const effectiveBasePath = configuredBasePath || forwardedPrefix;

  // 1. Explicit base path matching
  if (effectiveBasePath && req.url.startsWith(effectiveBasePath)) {
    req.basePath = effectiveBasePath;
    const remaining = req.url.slice(effectiveBasePath.length);
    req.url = remaining.startsWith('/') ? remaining : (remaining ? '/' + remaining : '/');
    return next();
  }

  const KNOWN_ROOTS = '(?:api|admin|explore|legal|privacy|terms|about|assets)';

  // 2. Direct bare access without trailing slash (e.g. GET /scratch-ai -> 301 to /scratch-ai/)
  const bareMatch = req.url.match(new RegExp(`^(\\/(?!${KNOWN_ROOTS}\\b)[a-zA-Z0-9_\\-]+)$`));
  if (bareMatch) {
    return res.redirect(301, req.url + '/');
  }

  // 3. Dynamic subpath detection for unknown prefixes:
  // Matches e.g. /<subpath>/ OR /<subpath>/api/... OR /<subpath>/explorer.css
  const subpathMatch = req.url.match(new RegExp(`^(\\/(?!${KNOWN_ROOTS}\\b)[a-zA-Z0-9_\\-]+)(\\/.*)$`));
  if (subpathMatch) {
    req.basePath = subpathMatch[1];
    req.url = subpathMatch[2];
    return next();
  }

  req.basePath = effectiveBasePath || '';
  next();
});

// Serve static community explorer assets without automatically serving raw index.html (handled dynamically below)
app.use(express.static(path.resolve(__dirname, '../public/explorer'), { index: false }));

// Apply general rate limiting to API routes
app.use('/api', apiLimiter);

// Register routes
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/projects'));
app.use('/api', require('./routes/votes'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/publicStats'));
app.use('/api/admin', require('./routes/admin'));

// Load Community Explorer and Legal HTML Templates
const indexHtmlPath = path.resolve(__dirname, '../public/explorer/index.html');
const legalHtmlPath = path.resolve(__dirname, '../public/explorer/legal.html');
let indexHtmlTemplate = '';
let legalHtmlTemplate = '';
try {
  indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (e) {
  console.error('Could not preload explorer index.html:', e);
}
try {
  legalHtmlTemplate = fs.readFileSync(legalHtmlPath, 'utf8');
} catch (e) {
  console.error('Could not preload legal.html:', e);
}

// Community Explorer Page (Also serves unified Admin User Management view)
app.get(['/', '/explore', '/explore/', '/admin', '/admin/'], (req, res) => {
  const forwardedPrefix = (req.headers['x-forwarded-prefix'] || '').trim().replace(/\/+$/, '');
  const currentBase = (req.basePath || forwardedPrefix || configuredBasePath || '').replace(/\/+$/, '');
  const baseHref = currentBase ? currentBase + '/' : '/';

  // Inject <base href="..."> and window.__BASE_PATH__ for seamless subroute asset resolution
  const html = indexHtmlTemplate.replace(
    '<head>',
    `<head>\n  <base href="${baseHref}">\n  <script>window.__BASE_PATH__ = "${currentBase}";</script>`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Legal, Privacy (GDPR), Terms, and About Pages (Mandatory for LCEN & Chrome Web Store)
app.get(['/legal', '/legal/', '/privacy', '/privacy/', '/terms', '/terms/', '/about', '/about/'], (req, res) => {
  const forwardedPrefix = (req.headers['x-forwarded-prefix'] || '').trim().replace(/\/+$/, '');
  const currentBase = (req.basePath || forwardedPrefix || configuredBasePath || '').replace(/\/+$/, '');
  const baseHref = currentBase ? currentBase + '/' : '/';

  const html = legalHtmlTemplate.replace(
    '<head>',
    `<head>\n  <base href="${baseHref}">\n  <script>window.__BASE_PATH__ = "${currentBase}";</script>`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Extension Version & Update Check Endpoint
app.get('/api/version', (req, res) => {
  const base = req.basePath || configuredBasePath || '';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  const serverUrl = host ? `${protocol}://${host}${base}` : '';
  res.json({
    version: '1.0.0',
    extensionHash: getExtensionHash(),
    downloadUrl: `${serverUrl}/api/extension/download?browser=chrome`,
    downloadUrls: {
      chrome: `${serverUrl}/api/extension/download?browser=chrome`,
      firefox: `${serverUrl}/api/extension/download?browser=firefox`
    }
  });
});

// JSON info route
app.get('/api/info', (req, res) => {
  const base = req.basePath || configuredBasePath || '';
  res.json({
    name: 'Scratch AI API',
    description: 'Centralized backend service for Scratch AI Community Extension',
    version: '1.0.0',
    basePath: base || '/',
    endpoints: {
      health: base + '/api/health',
      communityStats: base + '/api/stats',
      projectStats: base + '/api/projects/:projectId',
      submitVote: `POST ${base}/api/votes`,
      userVotes: base + '/api/users/:userId/votes',
      publicCsvExport: base + '/api/export/csv?type=votes|projects',
      communityExplorer: base + '/',
      adminDashboard: base + '/admin'
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
