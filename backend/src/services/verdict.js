const config = require('../config');

/**
 * Calculates voting statistics and verdict for a project based on AI and Human vote counts.
 *
 * Verdict rules:
 * - Minimum 5 votes required.
 * - Total votes < 5: "Insufficient data"
 * - AI percentage > 50%: "AI-generated"
 * - AI percentage < 50%: "Human-created"
 * - AI percentage === 50%: "Undetermined"
 */
function calculateVerdict(aiVotes = 0, humanVotes = 0) {
  const ai = Number(aiVotes) || 0;
  const human = Number(humanVotes) || 0;
  const total = ai + human;

  let aiPercentage = 0;
  let humanPercentage = 0;
  let verdict = 'Insufficient data';
  const isReliable = total >= config.minVotesForVerdict;

  if (total > 0) {
    aiPercentage = Number(((ai / total) * 100).toFixed(1));
    humanPercentage = Number(((human / total) * 100).toFixed(1));

    // Ensure they sum to exactly 100% when rounded
    if (ai + human === total && total > 0) {
      // Keep accurate floats with 1 decimal
    }
  }

  if (!isReliable) {
    verdict = 'Insufficient data';
  } else if (aiPercentage > 50) {
    verdict = 'AI-generated';
  } else if (aiPercentage < 50) {
    verdict = 'Human-created';
  } else {
    verdict = 'Undetermined';
  }

  return {
    totalVotes: total,
    aiVotes: ai,
    humanVotes: human,
    aiPercentage,
    humanPercentage,
    verdict,
    isReliable,
    minVotesRequired: config.minVotesForVerdict,
    disclaimer: 'Community verdict based on human votes, not a technically verified AI detection result.'
  };
}

/**
 * Formats a raw project row from the database into a clean API response
 */
function formatProjectResponse(projectRow, projectId) {
  const pId = String(projectId || (projectRow ? projectRow.project_id : ''));
  const ai = projectRow ? (projectRow.ai_votes || 0) : 0;
  const human = projectRow ? (projectRow.human_votes || 0) : 0;
  const stats = calculateVerdict(ai, human);

  return {
    projectId: pId,
    scratchUrl: `https://scratch.mit.edu/projects/${pId}/`,
    ...stats,
    createdAt: projectRow ? projectRow.created_at : null,
    updatedAt: projectRow ? projectRow.updated_at : null
  };
}

module.exports = {
  calculateVerdict,
  formatProjectResponse
};
