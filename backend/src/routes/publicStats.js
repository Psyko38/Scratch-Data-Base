const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { validateProjectIdParam } = require('../middleware/validate');
const { calculateVerdict, formatProjectResponse } = require('../services/verdict');
const { buildExtensionZip } = require('../utils/zipBuilder');

function maskUUID(uuid) {
  if (!uuid || uuid.length < 8) return 'anonymous';
  return uuid.substring(0, 8) + '…' + uuid.substring(uuid.length - 4);
}

/**
 * GET /api/stats
 * Public community overview statistics (Read-Only)
 */
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.queryOne('SELECT COUNT(*) as count FROM users')?.count || 0;
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

    // Most voted projects (top 15)
    const mostVotedRaw = db.queryAll(`
      SELECT project_id, total_votes, ai_votes, human_votes, updated_at
      FROM projects
      ORDER BY total_votes DESC
      LIMIT 15
    `);

    const mostVotedProjects = mostVotedRaw.map(p => formatProjectResponse(p, p.project_id));

    // Top AI-detected projects (up to 15)
    const topAiRaw = db.queryAll(`
      SELECT project_id, total_votes, ai_votes, human_votes, updated_at
      FROM projects
      WHERE ai_votes > human_votes AND ai_votes > 0
      ORDER BY ai_votes DESC, total_votes DESC
      LIMIT 15
    `);
    const topAiProjects = topAiRaw.map(p => formatProjectResponse(p, p.project_id));

    // Top Human-created projects (up to 15)
    const topHumanRaw = db.queryAll(`
      SELECT project_id, total_votes, ai_votes, human_votes, updated_at
      FROM projects
      WHERE human_votes >= ai_votes AND human_votes > 0
      ORDER BY human_votes DESC, total_votes DESC
      LIMIT 15
    `);
    const topHumanProjects = topHumanRaw.map(p => formatProjectResponse(p, p.project_id));

    // Recent votes (top 25) with masked voter IDs for privacy
    const recentVotes = db.queryAll(`
      SELECT
        id as vote_id,
        project_id,
        user_id,
        vote,
        created_at
      FROM votes
      ORDER BY created_at DESC
      LIMIT 25
    `);

    res.json({
      metrics: {
        totalUsers,
        totalProjects,
        totalVotes,
        aiVotes,
        humanVotes,
        aiPercentage: globalVerdict.aiPercentage,
        humanPercentage: globalVerdict.humanPercentage
      },
      mostVotedProjects,
      topAiProjects,
      topHumanProjects,
      recentVotes: recentVotes.map(v => ({
        projectId: v.project_id,
        scratchUrl: `https://scratch.mit.edu/projects/${v.project_id}/`,
        maskedUserId: maskUUID(v.user_id),
        vote: v.vote,
        createdAt: v.created_at
      }))
    });
  } catch (err) {
    console.error('Error fetching public stats:', err);
    res.status(500).json({ error: 'Failed to retrieve community statistics.' });
  }
});

/**
 * GET /api/projects/:projectId/history/public
 * Public project vote history (Read-Only, voter UUIDs masked)
 */
router.get('/projects/:projectId/history/public', validateProjectIdParam, (req, res) => {
  const { projectId } = req.params;

  try {
    const projectRow = db.queryOne('SELECT * FROM projects WHERE project_id = ?', [projectId]);
    const formatted = formatProjectResponse(projectRow, projectId);

    const votes = db.queryAll(`
      SELECT
        user_id,
        vote,
        created_at
      FROM votes
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [projectId]);

    res.json({
      project: formatted,
      votes: votes.map(v => ({
        maskedUserId: maskUUID(v.user_id),
        vote: v.vote,
        createdAt: v.created_at
      }))
    });
  } catch (err) {
    console.error('Error fetching project public history:', err);
    res.status(500).json({ error: 'Failed to retrieve project details.' });
  }
});

/**
 * GET /api/export/csv
 * Public CSV download for community votes or project statistics
 */
router.get('/export/csv', (req, res) => {
  const exportType = req.query.type === 'projects' ? 'projects' : 'votes';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    if (exportType === 'projects') {
      const projects = db.queryAll('SELECT * FROM projects ORDER BY total_votes DESC');
      const headers = ['project_id', 'scratch_url', 'total_votes', 'ai_votes', 'human_votes', 'ai_percentage', 'human_percentage', 'verdict', 'updated_at'];

      const rows = projects.map(p => {
        const v = calculateVerdict(p.ai_votes, p.human_votes);
        return [
          p.project_id,
          `"https://scratch.mit.edu/projects/${p.project_id}/"`,
          p.total_votes,
          p.ai_votes,
          p.human_votes,
          v.aiPercentage,
          v.humanPercentage,
          `"${v.verdict}"`,
          p.updated_at
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cao-scratch-projects-${timestamp}.csv"`);
      return res.send(csv);
    } else {
      const votes = db.queryAll(`
        SELECT project_id, user_id, vote, created_at
        FROM votes
        ORDER BY created_at DESC
      `);
      const headers = ['project_id', 'scratch_url', 'masked_user_id', 'vote', 'created_at'];

      const rows = votes.map(v => [
        v.project_id,
        `"https://scratch.mit.edu/projects/${v.project_id}/"`,
        maskUUID(v.user_id),
        v.vote,
        v.created_at
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cao-scratch-community-votes-${timestamp}.csv"`);
      return res.send(csv);
    }
  } catch (err) {
    console.error('Error generating public CSV export:', err);
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

/**
 * GET /api/extension/download
 * Download packaged Chrome or Firefox extension (.zip)
 * Query param: ?browser=chrome | firefox
 */
router.get('/extension/download', (req, res) => {
  const browser = req.query.browser === 'firefox' ? 'firefox' : 'chrome';
  try {
    const zipBuffer = buildExtensionZip(browser);
    const filename = `scratch-ai-${browser}-extension.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    return res.send(zipBuffer);
  } catch (err) {
    console.error('Error building extension ZIP:', err);
    res.status(500).json({ error: 'Failed to package extension archive.' });
  }
});

module.exports = router;
