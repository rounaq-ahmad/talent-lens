const jwt = require('jsonwebtoken');

/** Require a valid admin JWT in Authorization: Bearer <token> */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Attach req.isAdmin = true if a valid admin JWT is present — does not block. */
function optionalAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.isAdmin = true;
    } catch { /* ignore */ }
  }
  next();
}

/** Require x-session-token header matching an active test session in the DB. */
function requireSession(req, res, next) {
  const db = require('../db');
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const row = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(token);
  if (!row) return res.status(401).json({ error: 'Invalid session token' });
  if (row.completed) return res.status(400).json({ error: 'Session already submitted' });

  req.session = {
    ...row,
    question_ids: JSON.parse(row.question_ids),
    answers: JSON.parse(row.answers),
  };
  next();
}

module.exports = { requireAdmin, optionalAdmin, requireSession };
