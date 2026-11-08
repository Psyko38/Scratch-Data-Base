const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const config = require('../config');
const { loginLimiter } = require('../middleware/rateLimiter');
const { signAdminToken, requireAdminAuth } = require('../middleware/auth');
const { validateProjectIdParam, validateUserIdParam } = require('../middleware/validate');
const { calculateVerdict, formatProjectResponse } = require('../services/verdict');

/**
 * POST /api/admin/login
 */
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db.queryOne('SELECT * FROM admins WHERE username = ?', [username.trim()]);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = signAdminToken(admin);

  // Set HTTP-only cookie
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    message: 'Login successful',
    token, // Also return in body so clients without cookies can use Bearer header
    admin: {
      id: admin.id,
      username: admin.username
    }
  });
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/admin/me
 */
router.get('/me', requireAdminAuth, (req, res) => {
  res.json({
    admin: req.admin
  });
});

/**
 * GET /api/admin/users
 * List all registered users with their vote counts and ban status
 */
router.get('/users', requireAdminAuth, (req, res) => {
  try {
    const users = db.queryAll(`
      SELECT
        u.id as user_id,
        u.is_banned,
        u.created_at,
        u.updated_at,
        COUNT(v.id) as total_votes,
        COALESCE(SUM(CASE WHEN v.vote = 'ai' THEN 1 ELSE 0 END), 0) as ai_votes,
        COALESCE(SUM(CASE WHEN v.vote = 'human' THEN 1 ELSE 0 END), 0) as human_votes
      FROM users u
      LEFT JOIN votes v ON u.id = v.user_id
      GROUP BY u.id
      ORDER BY u.updated_at DESC
    `);

    const totalUsers = users.length;
    const bannedUsers = users.filter(u => u.is_banned).length;

    res.json({
      totalUsers,
      bannedUsers,
      activeUsers: totalUsers - bannedUsers,
      users: users.map(u => ({
        userId: u.user_id,
        isBanned: Boolean(u.is_banned),
        totalVotes: u.total_votes || 0,
        aiVotes: u.ai_votes || 0,
        humanVotes: u.human_votes || 0,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    });
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Failed to retrieve users list.' });
  }
});

/**
 * GET /api/admin/stats
 * Overview dashboard metrics
 */
router.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const totalUsers = db.queryOne('SELECT COUNT(*) as count FROM users')?.count || 0;
    const bannedUsers = db.queryOne('SELECT COUNT(*) as count FROM users WHERE is_banned = 1')?.count || 0;
    const totalProjects = db.queryOne('SELECT COUNT(*) as count FROM projects')?.count || 0;
    const totalVotes = db.queryOne('SELECT COUNT(*) as count FROM votes')?.count || 0;

    const voteBreakdown = db.queryOne(`
      SELECT
        COALESCE(SUM(CASE WHEN vote = 'ai' THEN 1 ELSE 0 END), 0) as ai,
        COALESCE(SUM(CASE WHEN vote = 'human' THEN 1 ELSE 0 END), 0) as human
      FROM votes
    `) || { ai: 0, human: 0 };

    const aiVotes = voteBreakdown.ai || 0;
    const humanVotes = voteBreakdown.human || 0;
    const globalVerdict = calculateVerdict(aiVotes, humanVotes);

    // Most voted projects (top 10)
    const mostVotedRaw = db.queryAll(`
      SELECT project_id, total_votes, ai_votes, human_votes, updated_at
      FROM projects
      ORDER BY total_votes DESC
      LIMIT 10
    `);

    const mostVotedProjects = mostVotedRaw.map(p => formatProjectResponse(p, p.project_id));

    // Recent votes (top 20)
    const recentVotes = db.queryAll(`
      SELECT
        v.id as vote_id,
        v.project_id,
        v.user_id,
        v.vote,
        v.created_at,
        v.updated_at,
        u.is_banned
      FROM votes v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
      LIMIT 20
    `);

    // Verdict counts across all projects
    const allProjects = db.queryAll('SELECT ai_votes, human_votes, total_votes FROM projects');
    const verdictCounts = {
      'AI-generated': 0,
      'Human-created': 0,
      'Undetermined': 0,
      'Insufficient data': 0
    };

    allProjects.forEach(p => {
      const v = calculateVerdict(p.ai_votes, p.human_votes);
      if (verdictCounts[v.verdict] !== undefined) {
        verdictCounts[v.verdict]++;
      }
    });

    res.json({
      metrics: {
        totalUsers,
        bannedUsers,
        totalProjects,
        totalVotes,
        aiVotes,
        humanVotes,
        aiPercentage: globalVerdict.aiPercentage,
        humanPercentage: globalVerdict.humanPercentage,
        verdictCounts
      },
      mostVotedProjects,
      recentVotes: recentVotes.map(v => ({
        voteId: v.vote_id,
        projectId: v.project_id,
        userId: v.user_id,
        vote: v.vote,
        isBanned: Boolean(v.is_banned),
        createdAt: v.created_at,
        updatedAt: v.updated_at
      }))
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to retrieve administrative statistics.' });
  }
});

/**
 * GET /api/admin/projects/:projectId/history
 * Detailed project statistics and individual voting history
 */
router.get('/projects/:projectId/history', requireAdminAuth, validateProjectIdParam, (req, res) => {
  const { projectId } = req.params;

  const projectRow = db.queryOne('SELECT * FROM projects WHERE project_id = ?', [projectId]);
  const formatted = formatProjectResponse(projectRow, projectId);

  const votes = db.queryAll(`
    SELECT
      v.id as vote_id,
      v.user_id,
      v.vote,
      v.created_at,
      v.updated_at,
      u.is_banned
    FROM votes v
    LEFT JOIN users u ON v.user_id = u.id
    WHERE v.project_id = ?
    ORDER BY v.created_at DESC
  `, [projectId]);

  res.json({
    project: formatted,
    votes: votes.map(v => ({
      voteId: v.vote_id,
      userId: v.user_id,
      vote: v.vote,
      isBanned: Boolean(v.is_banned),
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }))
  });
});

/**
 * DELETE /api/admin/votes/:voteId
 * Remove a fraudulent or invalid vote and recalculate project statistics
 */
router.delete('/votes/:voteId', requireAdminAuth, (req, res) => {
  const { voteId } = req.params;

  try {
    const existingVote = db.queryOne('SELECT * FROM votes WHERE id = ?', [voteId]);
    if (!existingVote) {
      return res.status(404).json({ error: 'Vote not found.' });
    }

    const { project_id: projectId } = existingVote;

    db.transaction(() => {
      db.execute('DELETE FROM votes WHERE id = ?', [voteId]);

      // Recalculate project stats
      const counts = db.queryOne(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN vote = 'ai' THEN 1 ELSE 0 END), 0) as ai,
          COALESCE(SUM(CASE WHEN vote = 'human' THEN 1 ELSE 0 END), 0) as human
        FROM votes WHERE project_id = ?
      `, [projectId]);

      const now = new Date().toISOString();
      db.execute(
        'UPDATE projects SET total_votes = ?, ai_votes = ?, human_votes = ?, updated_at = ? WHERE project_id = ?',
        [counts.total, counts.ai, counts.human, now, projectId]
      );
    });

    const updatedProject = db.queryOne('SELECT * FROM projects WHERE project_id = ?', [projectId]);

    res.json({
      success: true,
      message: 'Vote removed successfully and project stats recalculated.',
      project: formatProjectResponse(updatedProject, projectId)
    });
  } catch (err) {
    console.error('Error removing vote:', err);
    res.status(500).json({ error: 'Failed to remove vote.' });
  }
});

/**
 * POST /api/admin/users/:userId/ban
 * Ban an abusive user. Optional body: { deleteVotes: true }
 */
router.post('/users/:userId/ban', requireAdminAuth, validateUserIdParam, (req, res) => {
  const { userId } = req.params;
  const deleteVotes = Boolean(req.body && req.body.deleteVotes);
  const now = new Date().toISOString();

  try {
    let user = db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      db.execute(
        'INSERT INTO users (id, is_banned, created_at, updated_at) VALUES (?, 1, ?, ?)',
        [userId, now, now]
      );
    } else {
      db.execute('UPDATE users SET is_banned = 1, updated_at = ? WHERE id = ?', [now, userId]);
    }

    let deletedVotesCount = 0;
    if (deleteVotes) {
      // Find all projects affected by this user
      const affected = db.queryAll('SELECT DISTINCT project_id FROM votes WHERE user_id = ?', [userId]);

      db.transaction(() => {
        const deleteResult = db.execute('DELETE FROM votes WHERE user_id = ?', [userId]);
        deletedVotesCount = deleteResult.changes || 0;

        for (const row of affected) {
          const counts = db.queryOne(`
            SELECT
              COUNT(*) as total,
              COALESCE(SUM(CASE WHEN vote = 'ai' THEN 1 ELSE 0 END), 0) as ai,
              COALESCE(SUM(CASE WHEN vote = 'human' THEN 1 ELSE 0 END), 0) as human
            FROM votes WHERE project_id = ?
          `, [row.project_id]);

          db.execute(
            'UPDATE projects SET total_votes = ?, ai_votes = ?, human_votes = ?, updated_at = ? WHERE project_id = ?',
            [counts.total, counts.ai, counts.human, now, row.project_id]
          );
        }
      });
    }

    res.json({
      success: true,
      message: `User ${userId} has been banned.${deleteVotes ? ` Removed ${deletedVotesCount} votes.` : ''}`,
      userId,
      isBanned: true,
      deletedVotesCount
    });
  } catch (err) {
    console.error('Error banning user:', err);
    res.status(500).json({ error: 'Failed to ban user.' });
  }
});

/**
 * DELETE /api/admin/users/:userId/ban
 * Unban a user
 */
router.delete('/users/:userId/ban', requireAdminAuth, validateUserIdParam, (req, res) => {
  const { userId } = req.params;
  const now = new Date().toISOString();

  try {
    const user = db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    db.execute('UPDATE users SET is_banned = 0, updated_at = ? WHERE id = ?', [now, userId]);

    res.json({
      success: true,
      message: `User ${userId} has been unbanned.`,
      userId,
      isBanned: false
    });
  } catch (err) {
    console.error('Error unbanning user:', err);
    res.status(500).json({ error: 'Failed to unban user.' });
  }
});

/**
 * POST /api/admin/projects/:projectId/reset
 * Reset project voting statistics
 */
router.post('/projects/:projectId/reset', requireAdminAuth, validateProjectIdParam, (req, res) => {
  const { projectId } = req.params;
  const now = new Date().toISOString();

  try {
    db.transaction(() => {
      db.execute('DELETE FROM votes WHERE project_id = ?', [projectId]);
      db.execute(
        `INSERT INTO projects (project_id, total_votes, ai_votes, human_votes, created_at, updated_at)
         VALUES (?, 0, 0, 0, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET
           total_votes = 0,
           ai_votes = 0,
           human_votes = 0,
           updated_at = excluded.updated_at`,
        [projectId, now, now]
      );
    });

    const resetProject = db.queryOne('SELECT * FROM projects WHERE project_id = ?', [projectId]);

    res.json({
      success: true,
      message: `Project ${projectId} statistics and votes have been reset to zero.`,
      project: formatProjectResponse(resetProject, projectId)
    });
  } catch (err) {
    console.error('Error resetting project:', err);
    res.status(500).json({ error: 'Failed to reset project statistics.' });
  }
});

/**
 * GET /api/admin/export/csv
 * Export votes or project statistics as CSV
 * Optional query parameter: ?type=projects | votes (default: votes)
 */
router.get('/export/csv', requireAdminAuth, (req, res) => {
  const exportType = req.query.type === 'projects' ? 'projects' : 'votes';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    if (exportType === 'projects') {
      const projects = db.queryAll('SELECT * FROM projects ORDER BY total_votes DESC');
      const headers = ['project_id', 'total_votes', 'ai_votes', 'human_votes', 'ai_percentage', 'human_percentage', 'verdict', 'created_at', 'updated_at'];

      const rows = projects.map(p => {
        const v = calculateVerdict(p.ai_votes, p.human_votes);
        return [
          p.project_id,
          p.total_votes,
          p.ai_votes,
          p.human_votes,
          v.aiPercentage,
          v.humanPercentage,
          `"${v.verdict}"`,
          p.created_at,
          p.updated_at
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cao-projects-${timestamp}.csv"`);
      return res.send(csv);
    } else {
      const votes = db.queryAll(`
        SELECT v.id, v.project_id, v.user_id, v.vote, v.created_at, v.updated_at, u.is_banned
        FROM votes v
        LEFT JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
      `);
      const headers = ['vote_id', 'project_id', 'user_id', 'vote', 'user_is_banned', 'created_at', 'updated_at'];

      const rows = votes.map(v => [
        v.id,
        v.project_id,
        v.user_id,
        v.vote,
        v.is_banned ? '1' : '0',
        v.created_at,
        v.updated_at
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cao-votes-${timestamp}.csv"`);
      return res.send(csv);
    }
  } catch (err) {
    console.error('Error generating CSV export:', err);
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

module.exports = router;
