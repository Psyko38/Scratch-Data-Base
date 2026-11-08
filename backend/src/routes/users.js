const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { validateUserIdParam, validateProjectIdParam } = require('../middleware/validate');

/**
 * GET /api/users/:userId/votes
 * Returns list of projects voted on by this user.
 */
router.get('/users/:userId/votes', validateUserIdParam, (req, res) => {
  const { userId } = req.params;

  const user = db.queryOne('SELECT id, is_banned, created_at FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.json({
      userId,
      totalVotes: 0,
      votes: []
    });
  }

  const votes = db.queryAll(
    `SELECT project_id, vote, created_at, updated_at
     FROM votes
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );

  res.json({
    userId,
    isBanned: Boolean(user.is_banned),
    totalVotes: votes.length,
    votes: votes.map(v => ({
      projectId: v.project_id,
      scratchUrl: `https://scratch.mit.edu/projects/${v.project_id}/`,
      vote: v.vote,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }))
  });
});

/**
 * GET /api/users/:userId/votes/:projectId
 * Returns vote details for a specific project by this user.
 */
router.get('/users/:userId/votes/:projectId', validateUserIdParam, validateProjectIdParam, (req, res) => {
  const { userId, projectId } = req.params;

  const vote = db.queryOne(
    'SELECT vote, created_at, updated_at FROM votes WHERE user_id = ? AND project_id = ?',
    [userId, projectId]
  );

  if (!vote) {
    return res.json({
      userId,
      projectId,
      hasVoted: false,
      vote: null
    });
  }

  res.json({
    userId,
    projectId,
    hasVoted: true,
    vote: vote.vote,
    createdAt: vote.created_at,
    updatedAt: vote.updated_at
  });
});

module.exports = router;
