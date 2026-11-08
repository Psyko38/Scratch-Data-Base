const rateLimit = require('express-rate-limit');

// Rate limiter for vote submissions
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // Limit each IP to 120 vote operations per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many vote requests from this IP. Please try again later.'
  }
});

// Strict rate limiter for admin login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 failed/successful login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.'
  }
});

module.exports = {
  voteLimiter,
  loginLimiter,
  apiLimiter
};
