const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function generateCode() {
  // Unambiguous characters (no 0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function withStatus(candidate) {
  const submission = db
    .prepare('SELECT id FROM submissions WHERE LOWER(candidate_name) = LOWER(?)')
    .get(candidate.name);
  return { ...candidate, completed: !!submission };
}

// GET /api/candidates — admin only
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM candidates ORDER BY rowid ASC').all();
  res.json(rows.map(withStatus));
});

// POST /api/candidates — admin only
router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while (db.prepare('SELECT id FROM candidates WHERE code = ?').get(code) && attempts < 10);

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO candidates (id, name, code) VALUES (?, ?, ?)').run(id, name.trim(), code);
  res.status(201).json(withStatus({ id, name: name.trim(), code }));
});

// DELETE /api/candidates/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
