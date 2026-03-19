const express = require('express');
const db = require('../db');
const { requireAdmin, optionalAdmin } = require('../middleware/auth');
const SAMPLE_QUESTIONS = require('../sample-questions');

const router = express.Router();

function strip(q) {
  const { correctAnswer, explanation, ...safe } = q;
  return safe;
}

// GET /api/questions
// Admin JWT → all questions (with correctAnswer).
// No JWT + requireCode mode → empty array (questions are not public).
// No JWT + open mode → active-only, stripped.
router.get('/', optionalAdmin, (req, res) => {
  const rows = db.prepare('SELECT data FROM questions').all();
  const questions = rows.map(r => JSON.parse(r.data));
  if (req.isAdmin) return res.json(questions);
  const { count } = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
  if (count > 0) return res.json([]); // restricted mode: no questions until test starts
  res.json(questions.filter(q => q.active !== false).map(strip));
});

// POST /api/questions — admin only
router.post('/', requireAdmin, (req, res) => {
  const q = req.body;
  db.prepare('INSERT INTO questions (id, data) VALUES (?, ?)').run(q.id, JSON.stringify(q));
  res.status(201).json(q);
});

// POST /api/questions/reset — must be before /:id
router.post('/reset', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM questions').run();
  const insert = db.prepare('INSERT INTO questions (id, data) VALUES (?, ?)');
  db.transaction(() => SAMPLE_QUESTIONS.forEach(q => insert.run(q.id, JSON.stringify(q))))();
  res.json(SAMPLE_QUESTIONS);
});

// PUT /api/questions/:id — admin only
router.put('/:id', requireAdmin, (req, res) => {
  const q = req.body;
  const result = db.prepare('UPDATE questions SET data = ? WHERE id = ?').run(JSON.stringify(q), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(q);
});

// PATCH /api/questions/:id/active — admin only
router.patch('/:id/active', requireAdmin, (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
  const row = db.prepare('SELECT data FROM questions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const q = { ...JSON.parse(row.data), active };
  db.prepare('UPDATE questions SET data = ? WHERE id = ?').run(JSON.stringify(q), req.params.id);
  res.json(q);
});

// DELETE /api/questions/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
