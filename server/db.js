const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'db.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS test_sessions (
    id               TEXT    PRIMARY KEY,
    candidate_name   TEXT    NOT NULL,
    start_time       INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    question_ids     TEXT    NOT NULL,
    answers          TEXT    NOT NULL DEFAULT '{}',
    completed        INTEGER NOT NULL DEFAULT 0,
    end_time         INTEGER
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id             TEXT PRIMARY KEY,
    candidate_name TEXT NOT NULL,
    submitted_at   TEXT NOT NULL,
    result         TEXT NOT NULL
  );
`);

// Seed default settings
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('duration_minutes', '60')`).run();

// Seed sample questions on first run
const { count } = db.prepare('SELECT COUNT(*) as count FROM questions').get();
if (count === 0) {
  const samples = require('./sample-questions');
  const insert = db.prepare('INSERT INTO questions (id, data) VALUES (?, ?)');
  db.transaction(() => samples.forEach(q => insert.run(q.id, JSON.stringify(q))))();
  console.log(`Seeded ${samples.length} sample questions.`);
}

module.exports = db;
