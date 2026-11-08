const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateVerdict } = require('../src/services/verdict');

describe('Verdict Algorithm Tests', () => {
  it('should return Insufficient data when total votes < 5', () => {
    const res1 = calculateVerdict(0, 0);
    assert.equal(res1.verdict, 'Insufficient data');
    assert.equal(res1.isReliable, false);
    assert.equal(res1.totalVotes, 0);

    const res2 = calculateVerdict(3, 1); // 4 votes
    assert.equal(res2.verdict, 'Insufficient data');
    assert.equal(res2.isReliable, false);
    assert.equal(res2.totalVotes, 4);
    assert.equal(res2.aiPercentage, 75);
    assert.equal(res2.humanPercentage, 25);
  });

  it('should return AI-generated when total votes >= 5 and AI percentage > 50%', () => {
    const res = calculateVerdict(4, 1); // 5 votes (80% AI)
    assert.equal(res.verdict, 'AI-generated');
    assert.equal(res.isReliable, true);
    assert.equal(res.totalVotes, 5);
    assert.equal(res.aiVotes, 4);
    assert.equal(res.humanVotes, 1);
    assert.equal(res.aiPercentage, 80);
    assert.equal(res.humanPercentage, 20);
  });

  it('should return Human-created when total votes >= 5 and AI percentage < 50%', () => {
    const res = calculateVerdict(2, 8); // 10 votes (20% AI, 80% Human)
    assert.equal(res.verdict, 'Human-created');
    assert.equal(res.isReliable, true);
    assert.equal(res.totalVotes, 10);
    assert.equal(res.aiPercentage, 20);
    assert.equal(res.humanPercentage, 80);
  });

  it('should return Undetermined when total votes >= 5 and AI percentage === 50%', () => {
    const res = calculateVerdict(5, 5); // 10 votes (50% AI, 50% Human)
    assert.equal(res.verdict, 'Undetermined');
    assert.equal(res.isReliable, true);
    assert.equal(res.totalVotes, 10);
    assert.equal(res.aiPercentage, 50);
    assert.equal(res.humanPercentage, 50);
  });
});
