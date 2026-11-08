const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { validateProjectIdParam, UUID_REGEX } = require('../middleware/validate');
const { formatProjectResponse } = require('../services/verdict');

/**
 * POST /api/projects/batch
 * Returns voting statistics for an array of projectIds (up to 100 at once)
 */
router.post('/projects/batch', (req, res) => {
  const rawIds = Array.isArray(req.body?.projectIds) ? req.body.projectIds : [];
  const cleanIds = [...new Set(
    rawIds
      .map(id => String(id).trim())
      .filter(id => /^\d{1,20}$/.test(id))
  )].slice(0, 100);

  if (cleanIds.length === 0) {
    return res.json({ projects: {} });
  }

  try {
    const placeholders = cleanIds.map(() => '?').join(',');
    const rows = db.queryAll(
      `SELECT * FROM projects WHERE project_id IN (${placeholders})`,
      cleanIds
    );

    const rowMap = {};
    for (const r of rows) {
      rowMap[String(r.project_id)] = r;
    }

    const projects = {};
    for (const id of cleanIds) {
      projects[id] = formatProjectResponse(rowMap[id] || null, id);
    }

    res.json({ projects });
  } catch (err) {
    console.error('Error in batch project lookup:', err);
    res.status(500).json({ error: 'Failed to retrieve batch project statistics.' });
  }
});

/**
 * GET /api/projects/:projectId
 * Returns project voting statistics and verdict.
 * Optional query parameter: ?userId=<UUID> returns user's current vote if any.
 */
router.get('/projects/:projectId', validateProjectIdParam, (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.query;

  const projectRow = db.queryOne(
    'SELECT * FROM projects WHERE project_id = ?',
    [projectId]
  );

  const response = formatProjectResponse(projectRow, projectId);

  // If userId query param provided and valid, attach user's current vote
  if (userId && UUID_REGEX.test(userId.trim())) {
    const userVote = db.queryOne(
      'SELECT vote, created_at, updated_at FROM votes WHERE project_id = ? AND user_id = ?',
      [projectId, userId.trim()]
    );
    response.userVote = userVote ? userVote.vote : null;
    response.userVotedAt = userVote ? userVote.updated_at || userVote.created_at : null;
  }

  res.json(response);
});

module.exports = router;
