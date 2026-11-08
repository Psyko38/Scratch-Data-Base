const crypto = require('node:crypto');
const db = require('../src/db/database');

console.log('Seeding sample data for Cao AI Detector...');
db.init();

const sampleProjects = [
  { id: '1012849182', ai: 42, human: 6 },   // Strongly AI (87.5%)
  { id: '984712391',  ai: 8,  human: 35 },  // Strongly Human (81.4%)
  { id: '857492019',  ai: 15, human: 15 },  // Exactly 50% Undetermined
  { id: '772910394',  ai: 2,  human: 1 },   // 3 votes total (Insufficient data)
  { id: '640192837',  ai: 24, human: 18 }   // AI-generated (57.1%)
];

const now = new Date().toISOString();

db.transaction(() => {
  for (const proj of sampleProjects) {
    console.log(`Seeding project ${proj.id} (${proj.ai} AI, ${proj.human} Human)...`);

    // Ensure project exists
    db.execute(
      `INSERT INTO projects (project_id, total_votes, ai_votes, human_votes, created_at, updated_at)
       VALUES (?, 0, 0, 0, ?, ?)
       ON CONFLICT(project_id) DO NOTHING`,
      [proj.id, now, now]
    );

    // Generate AI voters
    for (let i = 0; i < proj.ai; i++) {
      const userId = crypto.randomUUID();
      const voteId = crypto.randomUUID();
      db.execute(
        'INSERT INTO users (id, is_banned, created_at, updated_at) VALUES (?, 0, ?, ?)',
        [userId, now, now]
      );
      db.execute(
        'INSERT INTO votes (id, user_id, project_id, vote, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [voteId, userId, proj.id, 'ai', now, now]
      );
    }

    // Generate Human voters
    for (let i = 0; i < proj.human; i++) {
      const userId = crypto.randomUUID();
      const voteId = crypto.randomUUID();
      db.execute(
        'INSERT INTO users (id, is_banned, created_at, updated_at) VALUES (?, 0, ?, ?)',
        [userId, now, now]
      );
      db.execute(
        'INSERT INTO votes (id, user_id, project_id, vote, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [voteId, userId, proj.id, 'human', now, now]
      );
    }

    // Recalculate
    const total = proj.ai + proj.human;
    db.execute(
      'UPDATE projects SET total_votes = ?, ai_votes = ?, human_votes = ?, updated_at = ? WHERE project_id = ?',
      [total, proj.ai, proj.human, now, proj.id]
    );
  }
});

console.log('Seeding complete! Successfully seeded 5 sample Scratch projects.');
db.close();
