const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Configure test environment before loading app
const testDbPath = path.resolve(__dirname, 'test.db');
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'TestPassword123!';

const app = require('../src/app');
const db = require('../src/db/database');

describe('Cao AI Detector API Integration Tests', () => {
  let adminToken = '';
  const testProjectId = '999123456';
  const testUserId1 = crypto.randomUUID();
  const testUserId2 = crypto.randomUUID();
  const testUserId3 = crypto.randomUUID();
  const testUserId4 = crypto.randomUUID();
  const testUserId5 = crypto.randomUUID();

  after(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
        if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
        if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
      } catch (e) {}
    }
  });

  describe('Health Check', () => {
    it('GET /api/health should return status healthy and counts', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'healthy');
      assert.equal(typeof res.body.counts.votes, 'number');
    });
  });

  describe('Project Statistics (Unvoted project)', () => {
    it('GET /api/projects/:projectId should return empty project with Insufficient data', async () => {
      const res = await request(app).get(`/api/projects/${testProjectId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.projectId, testProjectId);
      assert.equal(res.body.totalVotes, 0);
      assert.equal(res.body.verdict, 'Insufficient data');
      assert.equal(res.body.isReliable, false);
    });

    it('GET /api/projects/:projectId with invalid ID should return 400', async () => {
      const res = await request(app).get('/api/projects/not-a-number');
      assert.equal(res.status, 400);
      assert.match(res.body.error, /numeric digits/i);
    });

    it('POST /api/projects/batch should return batch statistics for multiple project IDs', async () => {
      const res = await request(app)
        .post('/api/projects/batch')
        .send({ projectIds: [testProjectId, '1000001'] });
      assert.equal(res.status, 200);
      assert.ok(res.body.projects);
      assert.equal(res.body.projects[testProjectId].projectId, testProjectId);
      assert.equal(res.body.projects['1000001'].totalVotes, 0);
    });
  });

  describe('Voting and Duplicate Prevention', () => {
    it('POST /api/votes should create a new AI vote', async () => {
      const res = await request(app)
        .post('/api/votes')
        .send({
          projectId: testProjectId,
          userId: testUserId1,
          vote: 'ai'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.status, 'created');
      assert.equal(res.body.userVote, 'ai');
      assert.equal(res.body.project.totalVotes, 1);
      assert.equal(res.body.project.aiVotes, 1);
      assert.equal(res.body.project.humanVotes, 0);
    });

    it('POST /api/votes with same vote should return unchanged and not increment total', async () => {
      const res = await request(app)
        .post('/api/votes')
        .send({
          projectId: testProjectId,
          userId: testUserId1,
          vote: 'ai'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'unchanged');
      assert.equal(res.body.project.totalVotes, 1);
      assert.equal(res.body.project.aiVotes, 1);
    });

    it('POST /api/votes changing vote to "human" should update vote and adjust stats accurately', async () => {
      const res = await request(app)
        .post('/api/votes')
        .send({
          projectId: testProjectId,
          userId: testUserId1,
          vote: 'human'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'updated');
      assert.equal(res.body.userVote, 'human');
      assert.equal(res.body.project.totalVotes, 1);
      assert.equal(res.body.project.aiVotes, 0);
      assert.equal(res.body.project.humanVotes, 1);
    });

    it('Multiple distinct users voting reaches threshold and determines verdict', async () => {
      // User 1 already voted 'human'. Let's have User 2, 3, 4, 5 vote 'ai'
      await request(app).post('/api/votes').send({ projectId: testProjectId, userId: testUserId2, vote: 'ai' });
      await request(app).post('/api/votes').send({ projectId: testProjectId, userId: testUserId3, vote: 'ai' });
      await request(app).post('/api/votes').send({ projectId: testProjectId, userId: testUserId4, vote: 'ai' });
      const last = await request(app).post('/api/votes').send({ projectId: testProjectId, userId: testUserId5, vote: 'ai' });

      // Total 5 votes: 4 AI (80%), 1 Human (20%) -> AI-generated
      assert.equal(last.body.project.totalVotes, 5);
      assert.equal(last.body.project.aiVotes, 4);
      assert.equal(last.body.project.humanVotes, 1);
      assert.equal(last.body.project.aiPercentage, 80);
      assert.equal(last.body.project.humanPercentage, 20);
      assert.equal(last.body.project.verdict, 'AI-generated');
      assert.equal(last.body.project.isReliable, true);
    });

    it('GET /api/projects/:projectId?userId=... should return stats and user choice', async () => {
      const res = await request(app).get(`/api/projects/${testProjectId}?userId=${testUserId1}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.userVote, 'human');
      assert.equal(res.body.verdict, 'AI-generated');
    });

    it('GET /api/users/:userId/votes should return user history', async () => {
      const res = await request(app).get(`/api/users/${testUserId1}/votes`);
      assert.equal(res.status, 200);
      assert.equal(res.body.totalVotes, 1);
      assert.equal(res.body.votes[0].projectId, testProjectId);
      assert.equal(res.body.votes[0].vote, 'human');
    });
  });

  describe('Admin Authentication & Moderation', () => {
    it('POST /api/admin/login should fail with bad credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'WrongPassword!' });
      assert.equal(res.status, 401);
    });

    it('POST /api/admin/login should succeed with valid credentials and return token & cookie', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'TestPassword123!' });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.token);
      adminToken = res.body.token;

      // Check cookie
      const cookies = res.headers['set-cookie'];
      assert.ok(cookies);
      assert.ok(cookies.some(c => c.includes('cao_admin_token')));
    });

    it('GET /api/admin/stats without auth should return 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      assert.equal(res.status, 401);
    });

    it('GET /api/admin/stats with Bearer token should return overview metrics', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.metrics.totalVotes >= 5);
      assert.ok(Array.isArray(res.body.mostVotedProjects));
      assert.ok(Array.isArray(res.body.recentVotes));
    });

    it('GET /api/admin/users with Bearer token should return user management list', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(typeof res.body.totalUsers === 'number');
      assert.ok(Array.isArray(res.body.users));
      assert.ok(res.body.users.length >= 1);
    });

    it('GET /api/admin/projects/:projectId/history should return project vote history', async () => {
      const res = await request(app)
        .get(`/api/admin/projects/${testProjectId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.project.projectId, testProjectId);
      assert.equal(res.body.votes.length, 5);
    });

    it('POST /api/admin/users/:userId/ban should ban user and reject future votes', async () => {
      const banRes = await request(app)
        .post(`/api/admin/users/${testUserId2}/ban`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(banRes.status, 200);
      assert.equal(banRes.body.isBanned, true);

      // Banned user attempts to vote
      const voteRes = await request(app)
        .post('/api/votes')
        .send({
          projectId: '88888888',
          userId: testUserId2,
          vote: 'ai'
        });
      assert.equal(voteRes.status, 403);
      assert.match(voteRes.body.error, /banned/i);
    });

    it('DELETE /api/admin/votes/:voteId should delete fraudulent vote and recalculate', async () => {
      // Find vote by testUserId1
      const history = await request(app)
        .get(`/api/admin/projects/${testProjectId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      const voteToDelete = history.body.votes.find(v => v.userId === testUserId1);
      assert.ok(voteToDelete);

      const delRes = await request(app)
        .delete(`/api/admin/votes/${voteToDelete.voteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(delRes.status, 200);
      assert.equal(delRes.body.success, true);
      assert.equal(delRes.body.project.totalVotes, 4); // was 5, now 4
      assert.equal(delRes.body.project.humanVotes, 0); // User 1 was the only human vote!
    });

    it('GET /api/admin/export/csv should export CSV data', async () => {
      const res = await request(app)
        .get('/api/admin/export/csv?type=votes')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.text, /vote_id,project_id,user_id,vote/);
    });

    it('POST /api/admin/projects/:projectId/reset should reset project statistics to zero', async () => {
      const res = await request(app)
        .post(`/api/admin/projects/${testProjectId}/reset`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.project.totalVotes, 0);
      assert.equal(res.body.project.aiVotes, 0);
      assert.equal(res.body.project.humanVotes, 0);
      assert.equal(res.body.project.verdict, 'Insufficient data');
    });
  });

  describe('Public Community Explorer (Non-Admin Read-Only & Downloads)', () => {
    it('GET /api/stats should return public community statistics without auth', async () => {
      const res = await request(app).get('/api/stats');
      assert.equal(res.status, 200);
      assert.ok(typeof res.body.metrics.totalVotes === 'number');
      assert.ok(Array.isArray(res.body.mostVotedProjects));
      assert.ok(Array.isArray(res.body.recentVotes));
      if (res.body.recentVotes.length > 0) {
        // Ensure voter UUID is masked for privacy
        assert.ok(res.body.recentVotes[0].maskedUserId.includes('…'));
      }
    });

    it('GET /api/projects/:projectId/history/public should return public project history with masked voter IDs', async () => {
      const res = await request(app).get(`/api/projects/${testProjectId}/history/public`);
      assert.equal(res.status, 200);
      assert.equal(res.body.project.projectId, testProjectId);
      assert.ok(Array.isArray(res.body.votes));
    });

    it('GET /api/export/csv should allow public download of votes CSV without auth', async () => {
      const res = await request(app).get('/api/export/csv?type=votes');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.text, /project_id,scratch_url,masked_user_id,vote/);
    });

    it('GET /api/export/csv should allow public download of projects CSV without auth', async () => {
      const res = await request(app).get('/api/export/csv?type=projects');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.text, /project_id,scratch_url,total_votes,ai_votes,human_votes/);
    });

    it('GET / and GET /explore should serve the public community explorer HTML page', async () => {
      const rootRes = await request(app).get('/');
      assert.equal(rootRes.status, 200);
      assert.match(rootRes.text, /Scratch AI Detection Community Explorer/);

      const exploreRes = await request(app).get('/explore');
      assert.equal(exploreRes.status, 200);
      assert.match(exploreRes.text, /Scratch AI Detection Community Explorer/);
    });

    it('GET /api/extension/download should serve Chrome and Firefox extension ZIP packages', async () => {
      const chromeRes = await request(app).get('/api/extension/download?browser=chrome').buffer(true);
      assert.equal(chromeRes.status, 200);
      assert.match(chromeRes.headers['content-type'], /application\/zip/);
      assert.match(chromeRes.headers['content-disposition'], /scratch-ai-chrome-extension\.zip/);
      assert.ok(Number(chromeRes.headers['content-length']) > 1000);

      const firefoxRes = await request(app).get('/api/extension/download?browser=firefox').buffer(true);
      assert.equal(firefoxRes.status, 200);
      assert.match(firefoxRes.headers['content-type'], /application\/zip/);
      assert.match(firefoxRes.headers['content-disposition'], /scratch-ai-firefox-extension\.zip/);
      assert.ok(Number(firefoxRes.headers['content-length']) > 1000);
    });
  });

  describe('Subroute & Subpath Support (Alwaysdata, Reverse Proxies, Subdirectories)', () => {
    it('GET /scratch-ai/api/health should route seamlessly and return healthy status', async () => {
      const res = await request(app).get('/scratch-ai/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'healthy');
      assert.equal(res.body.database, 'ok');
    });

    it('GET /scratch-ai should 301 redirect to /scratch-ai/ with trailing slash', async () => {
      const res = await request(app).get('/scratch-ai');
      assert.equal(res.status, 301);
      assert.equal(res.headers.location, '/scratch-ai/');
    });

    it('GET /scratch-ai/ should inject <base href="/scratch-ai/"> and window.__BASE_PATH__', async () => {
      const res = await request(app).get('/scratch-ai/');
      assert.equal(res.status, 200);
      assert.match(res.text, /<base href="\/scratch-ai\/">/);
      assert.match(res.text, /window\.__BASE_PATH__ = "\/scratch-ai"/);
    });

    it('GET /scratch-ai/explorer.css should serve static css under subpath', async () => {
      const res = await request(app).get('/scratch-ai/explorer.css');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/css/);
    });

    it('GET /assets/main.js should serve compiled Svelte bundle', async () => {
      const res = await request(app).get('/assets/main.js');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /(?:application|text)\/javascript/);
      assert.ok(res.text.length > 1000);
    });

    it('GET /scratch-ai/assets/main.js should serve compiled Svelte bundle under subpath', async () => {
      const res = await request(app).get('/scratch-ai/assets/main.js');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /(?:application|text)\/javascript/);
      assert.ok(res.text.length > 1000);
    });

    it('GET /scratch-ai/api/info should show endpoints prefixed with /scratch-ai', async () => {
      const res = await request(app).get('/scratch-ai/api/info');
      assert.equal(res.status, 200);
      assert.equal(res.body.basePath, '/scratch-ai');
      assert.equal(res.body.endpoints.health, '/scratch-ai/api/health');
      assert.equal(res.body.endpoints.communityExplorer, '/scratch-ai/');
    });

    it('Reverse proxy with X-Forwarded-Prefix should inject prefix into <base href>', async () => {
      const res = await request(app).get('/').set('X-Forwarded-Prefix', '/proxy-subpath');
      assert.equal(res.status, 200);
      assert.match(res.text, /<base href="\/proxy-subpath\/">/);
      assert.match(res.text, /window\.__BASE_PATH__ = "\/proxy-subpath"/);
    });

    it('GET /api/version should return extension version and deterministic code hash', async () => {
      const res = await request(app).get('/api/version');
      assert.equal(res.status, 200);
      assert.equal(res.body.version, '1.0.0');
      assert.ok(typeof res.body.extensionHash === 'string');
      assert.equal(res.body.extensionHash.length, 16);
      assert.match(res.body.downloadUrl, /\/api\/extension\/download\?browser=chrome/);
    });

    it('GET /legal, /privacy, /terms should serve complete legal and GDPR compliance page', async () => {
      const legalRes = await request(app).get('/legal');
      assert.equal(legalRes.status, 200);
      assert.match(legalRes.text, /Legal Notice/);
      assert.match(legalRes.text, /Privacy Policy/);
      assert.match(legalRes.text, /Alwaysdata/);

      const privacyRes = await request(app).get('/privacy');
      assert.equal(privacyRes.status, 200);
      assert.match(privacyRes.text, /GDPR/);
    });
  });
});
