const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getSetting(key, defaultVal) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? Number(row.value) : defaultVal;
}

// GET /api/settings — public
router.get('/', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
  const rows = db.prepare('SELECT data FROM questions').all();
  const activeCount = rows.filter(r => {
    const q = JSON.parse(r.data);
    return q.active !== false;
  }).length;
  res.json({
    durationMinutes:    getSetting('duration_minutes', 60),
    requireCode:        count > 0,
    activeQuestionCount: activeCount,
  });
});

// PATCH /api/settings — admin only
router.patch('/', requireAdmin, (req, res) => {
  const { durationMinutes, targetPoints } = req.body;

  if (durationMinutes !== undefined) {
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1)
      return res.status(400).json({ error: 'durationMinutes must be a positive integer' });
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('duration_minutes', ?)`).run(String(durationMinutes));
  }

  if (targetPoints !== undefined) {
    if (!Number.isInteger(targetPoints) || targetPoints < 1)
      return res.status(400).json({ error: 'targetPoints must be a positive integer' });
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('target_points', ?)`).run(String(targetPoints));
  }

  res.json({
    durationMinutes: getSetting('duration_minutes', 60),
    targetPoints:    getSetting('target_points', 100),
  });
});

module.exports = router;
