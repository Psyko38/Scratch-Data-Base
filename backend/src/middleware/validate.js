// UUID format regex (v1-v5)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Scratch project IDs are numeric
const PROJECT_ID_REGEX = /^\d{1,30}$/;

function validateProjectIdParam(req, res, next) {
  const { projectId } = req.params;
  if (!projectId || !PROJECT_ID_REGEX.test(projectId.trim())) {
    return res.status(400).json({
      error: 'Invalid project ID. Scratch project IDs must be numeric digits.'
    });
  }
  req.params.projectId = projectId.trim();
  next();
}

function validateUserIdParam(req, res, next) {
  const { userId } = req.params;
  if (!userId || !UUID_REGEX.test(userId.trim())) {
    return res.status(400).json({
      error: 'Invalid user ID. Must be a valid UUID format.'
    });
  }
  req.params.userId = userId.trim();
  next();
}

function validateVoteSubmission(req, res, next) {
  const { projectId, userId, vote } = req.body || {};

  if (!projectId || !PROJECT_ID_REGEX.test(String(projectId).trim())) {
    return res.status(400).json({
      error: 'Invalid or missing projectId. Scratch project IDs must be numeric digits.'
    });
  }

  if (!userId || !UUID_REGEX.test(String(userId).trim())) {
    return res.status(400).json({
      error: 'Invalid or missing userId. Must be a valid UUID format.'
    });
  }

  if (!vote || !['ai', 'human'].includes(String(vote).toLowerCase().trim())) {
    return res.status(400).json({
      error: 'Invalid vote. Accepted values are "ai" or "human".'
    });
  }

  req.body.projectId = String(projectId).trim();
  req.body.userId = String(userId).trim();
  req.body.vote = String(vote).toLowerCase().trim();

  next();
}

module.exports = {
  validateProjectIdParam,
  validateUserIdParam,
  validateVoteSubmission,
  UUID_REGEX,
  PROJECT_ID_REGEX
};
