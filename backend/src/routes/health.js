const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/health', (req, res) => {
  let dbStatus = 'ok';
  let counts = { users: 0, projects: 0, votes: 0 };

  try {
    const userCount = db.queryOne('SELECT COUNT(*) as count FROM users');
    const projectCount = db.queryOne('SELECT COUNT(*) as count FROM projects');
    const voteCount = db.queryOne('SELECT COUNT(*) as count FROM votes');

    counts = {
      users: userCount ? userCount.count : 0,
      projects: projectCount ? projectCount.count : 0,
      votes: voteCount ? voteCount.count : 0
    };
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  res.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    database: dbStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    counts
  });
});

module.exports = router;
