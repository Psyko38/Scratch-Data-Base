const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function requireAdminAuth(req, res, next) {
  let token = null;

  // Check HTTP-only cookie first
  if (req.cookies && req.cookies[config.cookieName]) {
    token = req.cookies[config.cookieName];
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required to access administrator endpoints.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const admin = db.queryOne('SELECT id, username FROM admins WHERE id = ?', [decoded.id]);

    if (!admin) {
      return res.status(401).json({
        error: 'Unauthorized: Admin user not found or session revoked.'
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired session token.'
    });
  }
}

module.exports = {
  signAdminToken,
  requireAdminAuth
};
