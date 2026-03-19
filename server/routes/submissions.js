const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/submissions — admin only
router.get('/', requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT id, candidate_name, submitted_at, result FROM submissions ORDER BY submitted_at DESC')
    .all();
  res.json(
    rows.map(r => ({
      id: r.id,
      candidateName: r.candidate_name,
      submittedAt: r.submitted_at,
      result: JSON.parse(r.result),
    }))
  );
});

// PATCH /api/submissions/:id/grade — apply manual scores, recalculate totals
router.patch('/:id/grade', requireAdmin, (req, res) => {
  const { grades } = req.body; // { [questionId]: score }
  if (!grades || typeof grades !== 'object') {
    return res.status(400).json({ error: 'grades object is required' });
  }

  const row = db
    .prepare('SELECT result, submitted_at FROM submissions WHERE id = ?')
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const result = JSON.parse(row.result);

  let totalScore = 0;
  result.questionResults = result.questionResults.map(qr => {
    if (grades[qr.question.id] !== undefined) {
      const score = Math.max(0, Math.min(qr.question.points, Number(grades[qr.question.id])));
      totalScore += score;
      return { ...qr, score };
    }
    totalScore += qr.score;
    return qr;
  });

  result.totalScore = totalScore;
  result.percentage = result.maxScore > 0
    ? Math.round((totalScore / result.maxScore) * 100)
    : 0;

  db.prepare('UPDATE submissions SET result = ? WHERE id = ?')
    .run(JSON.stringify(result), req.params.id);

  res.json({
    id: req.params.id,
    candidateName: result.session.candidateName,
    submittedAt: row.submitted_at,
    result,
  });
});

// DELETE /api/submissions/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
