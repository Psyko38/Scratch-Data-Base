const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const db = require('../db/database');
const { validateVoteSubmission } = require('../middleware/validate');
const { voteLimiter } = require('../middleware/rateLimiter');
const { formatProjectResponse } = require('../services/verdict');

/**
 * POST /api/votes
 * Submits or updates a vote.
 * Request body: { projectId: "123456789", userId: "<UUID>", vote: "ai" | "human" }
 */
router.post('/votes', voteLimiter, validateVoteSubmission, (req, res) => {
  const { projectId, userId, vote } = req.body;
  const now = new Date().toISOString();

  try {
    // 1. Check or create user
    let user = db.queryOne('SELECT id, is_banned FROM users WHERE id = ?', [userId]);

    if (user && user.is_banned) {
      return res.status(403).json({
        error: 'Forbidden: This user is banned from submitting votes.'
      });
    }

    if (!user) {
      db.execute(
        'INSERT INTO users (id, is_banned, created_at, updated_at) VALUES (?, 0, ?, ?)',
        [userId, now, now]
      );
    }

    // 2. Perform vote insert/update and project recalculation in an atomic transaction
    const result = db.transaction(() => {
      // Ensure project row exists
      const existingProject = db.queryOne(
        'SELECT project_id FROM projects WHERE project_id = ?',
        [projectId]
      );

      if (!existingProject) {
        db.execute(
          'INSERT INTO projects (project_id, total_votes, ai_votes, human_votes, created_at, updated_at) VALUES (?, 0, 0, 0, ?, ?)',
          [projectId, now, now]
        );
      }

      // Check existing vote for this user and project
      const existingVote = db.queryOne(
        'SELECT id, vote FROM votes WHERE user_id = ? AND project_id = ?',
        [userId, projectId]
      );

      let actionStatus = 'created';

      if (existingVote) {
        if (existingVote.vote === vote) {
          actionStatus = 'unchanged';
        } else {
          db.execute(
            'UPDATE votes SET vote = ?, updated_at = ? WHERE id = ?',
            [vote, now, existingVote.id]
          );
          actionStatus = 'updated';
        }
      } else {
        const voteId = crypto.randomUUID();
        db.execute(
          'INSERT INTO votes (id, user_id, project_id, vote, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [voteId, userId, projectId, vote, now, now]
        );
      }

      // Safe recalculation from actual records to guarantee zero drift
      const counts = db.queryOne(
        `SELECT
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN vote = 'ai' THEN 1 ELSE 0 END), 0) as ai,
           COALESCE(SUM(CASE WHEN vote = 'human' THEN 1 ELSE 0 END), 0) as human
         FROM votes WHERE project_id = ?`,
        [projectId]
      );

      db.execute(
        'UPDATE projects SET total_votes = ?, ai_votes = ?, human_votes = ?, updated_at = ? WHERE project_id = ?',
        [counts.total, counts.ai, counts.human, now, projectId]
      );

      // Keep user updated_at in sync with latest activity
      db.execute(
        'UPDATE users SET updated_at = ? WHERE id = ?',
        [now, userId]
      );

      const updatedProjectRow = db.queryOne(
        'SELECT * FROM projects WHERE project_id = ?',
        [projectId]
      );

      return {
        actionStatus,
        projectRow: updatedProjectRow
      };
    });

    const formatted = formatProjectResponse(result.projectRow, projectId);
    formatted.userVote = vote;

    return res.status(result.actionStatus === 'created' ? 201 : 200).json({
      success: true,
      status: result.actionStatus,
      userVote: vote,
      project: formatted
    });
  } catch (err) {
    console.error('Error handling vote submission:', err);
    return res.status(500).json({
      error: 'An internal error occurred while processing the vote.'
    });
  }
});

module.exports = router;
