import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

export function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(path.join(dataDir, 'testcenter.sqlite'))
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('student','admin')), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS codes (
      id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL,
      user_id TEXT UNIQUE REFERENCES users(id), disabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), request_key TEXT,
      kind TEXT NOT NULL, status TEXT NOT NULL, options TEXT NOT NULL,
      checkpoint TEXT, generation_draft TEXT, task_id TEXT, attempt_id TEXT, error TEXT,
      day TEXT, slot INTEGER, progress INTEGER NOT NULL DEFAULT 0,
      retries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      UNIQUE(day,slot), UNIQUE(owner_id,request_key)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id),
      job_id TEXT UNIQUE REFERENCES jobs(id), grade INTEGER NOT NULL, stage TEXT NOT NULL,
      skill TEXT NOT NULL, format TEXT NOT NULL, title TEXT NOT NULL,
      content TEXT NOT NULL, audio_file TEXT, duration REAL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT NOT NULL REFERENCES tasks(id),
      answers TEXT NOT NULL DEFAULT '{}', essay TEXT NOT NULL DEFAULT '',
      seconds INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL, PRIMARY KEY(user_id,task_id)
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT NOT NULL REFERENCES tasks(id),
      request_id TEXT NOT NULL, answers TEXT NOT NULL, essay TEXT NOT NULL DEFAULT '',
      seconds INTEGER NOT NULL, status TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL,
      UNIQUE(user_id,request_id)
    );
    CREATE INDEX IF NOT EXISTS tasks_owner ON tasks(owner_id,created_at);
    CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id,task_id);
    CREATE INDEX IF NOT EXISTS jobs_queue ON jobs(status,created_at);
  `)
  if (!db.prepare('PRAGMA table_info(jobs)').all().some((column) => column.name === 'generation_draft'))
    db.exec('ALTER TABLE jobs ADD COLUMN generation_draft TEXT')
  return db
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export const now = () => new Date().toISOString()
