const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { validateProjectIdParam, UUID_REGEX } = require('../middleware/validate');
const { formatProjectResponse } = require('../services/verdict');

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
