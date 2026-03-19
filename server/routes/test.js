const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireSession } = require('../middleware/auth');

const router = express.Router();

function strip(q) {
  const { correctAnswer, explanation, ...safe } = q;
  return safe;
}

function getQuestionsByIds(ids) {
  return ids
    .map(id => {
      const row = db.prepare('SELECT data FROM questions WHERE id = ?').get(id);
      return row ? JSON.parse(row.data) : null;
    })
    .filter(Boolean);
}

// POST /api/test/start
router.post('/start', (req, res) => {
  const { candidateName, durationMinutes, code } = req.body;

  // If candidates table has entries, access code is required
  const { count } = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
  let resolvedName = candidateName?.trim();

  if (count > 0) {
    if (!code?.trim()) {
      return res.status(403).json({ error: 'An access code is required to start this assessment.' });
    }
    const candidate = db.prepare('SELECT * FROM candidates WHERE code = ?').get(code.trim().toUpperCase());
    if (!candidate) {
      return res.status(403).json({ error: 'Invalid access code. Please check the code and try again.' });
    }
    resolvedName = candidate.name;
  }

  if (!resolvedName || !durationMinutes) {
    return res.status(400).json({ error: 'Name and duration are required.' });
  }

  const existing = db.prepare('SELECT id FROM submissions WHERE LOWER(candidate_name) = LOWER(?)').get(resolvedName);
  if (existing) {
    return res.status(409).json({ error: 'You have already completed this assessment. Please contact the interviewer if you need to retake it.' });
  }

  const allRows = db.prepare('SELECT data FROM questions').all();
  const questions = allRows.map(r => JSON.parse(r.data)).filter(q => q.active !== false);

  if (questions.length === 0) {
    return res.status(400).json({ error: 'No active questions in the bank. Enable questions in the admin panel first.' });
  }

  const sessionToken = crypto.randomUUID();
  const startTime = Date.now();

  db.prepare(`
    INSERT INTO test_sessions (id, candidate_name, start_time, duration_minutes, question_ids, answers, completed)
    VALUES (?, ?, ?, ?, ?, '{}', 0)
  `).run(sessionToken, resolvedName, startTime, durationMinutes, JSON.stringify(questions.map(q => q.id)));

  res.json({
    sessionToken,
    candidateName: resolvedName,
    startTime: new Date(startTime).toISOString(),
    durationMinutes,
    questions: questions.map(strip), // correct answers never leave the server
  });
});

// GET /api/test/session — restore after page refresh
router.get('/session', requireSession, (req, res) => {
  const { id, candidate_name, start_time, duration_minutes, question_ids, answers } = req.session;
  const questions = getQuestionsByIds(question_ids).map(strip);
  res.json({
    sessionToken: id,
    candidateName: candidate_name,
    startTime: new Date(start_time).toISOString(),
    durationMinutes: duration_minutes,
    answers,
    questions,
  });
});

// POST /api/test/answer — save a single answer
router.post('/answer', requireSession, (req, res) => {
  const { questionId, answer } = req.body;
  const updated = { ...req.session.answers, [questionId]: { questionId, answer } };
  db.prepare('UPDATE test_sessions SET answers = ? WHERE id = ?')
    .run(JSON.stringify(updated), req.session.id);
  res.status(204).send();
});

// POST /api/test/submit — grade server-side, save submission
router.post('/submit', requireSession, (req, res) => {
  const { id, candidate_name, start_time, duration_minutes, question_ids, answers } = req.session;
  const endTime = Date.now();

  // Load full questions (with correctAnswer) — never sent to client
  const questions = getQuestionsByIds(question_ids);

  let totalScore = 0;
  let maxScore = 0;
  const questionResults = questions.map(q => {
    const ans = answers[q.id] ?? null;
    maxScore += q.points;

    let isCorrect;
    let score = 0;

    if (q.type === 'theoretical' && q.format === 'mcq') {
      isCorrect = ans !== null && ans.answer === q.correctAnswer;
      score = isCorrect ? q.points : 0;
    } else if (q.type === 'code-snippet') {
      isCorrect = ans !== null && ans.answer === q.correctAnswer;
      score = isCorrect ? q.points : 0;
    } else {
      isCorrect = undefined; // manual grading
      score = 0;
    }

    totalScore += score;
    return { question: q, answer: ans, isCorrect, score }; // full question stored in DB for admin
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const result = {
    session: {
      candidateName: candidate_name,
      startTime: new Date(start_time).toISOString(),
      endTime: new Date(endTime).toISOString(),
      answers,
      durationMinutes: duration_minutes,
      completed: true,
    },
    totalScore,
    maxScore,
    percentage,
    questionResults,
  };

  // Persist submission
  const submissionId = crypto.randomUUID();
  db.prepare('INSERT INTO submissions (id, candidate_name, submitted_at, result) VALUES (?, ?, ?, ?)')
    .run(submissionId, candidate_name, new Date(endTime).toISOString(), JSON.stringify(result));

  // Mark session done
  db.prepare('UPDATE test_sessions SET completed = 1, end_time = ? WHERE id = ?').run(endTime, id);

  // Return only the candidate summary — no scores, no answers
  res.json({
    candidateName: candidate_name,
    answeredCount: Object.keys(answers).length,
    totalQuestions: questions.length,
  });
});

module.exports = router;
