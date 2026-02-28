const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/vaad.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS apartments (
    id TEXT PRIMARY KEY,
    apt_num TEXT NOT NULL,
    owner_name TEXT DEFAULT '',
    owner_phone TEXT DEFAULT '',
    owner_email TEXT DEFAULT '',
    tenant_name TEXT DEFAULT '',
    tenant_phone TEXT DEFAULT '',
    tenant_email TEXT DEFAULT '',
    has_tenant INTEGER DEFAULT 0,
    monthly_fee REAL DEFAULT 400,
    notes TEXT DEFAULT '',
    send_reminders INTEGER DEFAULT 0,
    reminder_freq TEXT DEFAULT 'חודשי',
    reminder_day INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (date('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT '',
    apt_id TEXT DEFAULT '',
    party TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    receipt_name TEXT DEFAULT '',
    receipt_data TEXT DEFAULT '',
    receipt_mime TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    initials TEXT DEFAULT '',
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);

const ins = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
ins.run('pay_instructions', `להעברה בנקאית:\nבנק לאומי, סניף 800\nחשבון: 12345678\nעל שם: ועד בית רמז 3 רמת השרון\n\nלחלופין — תשלום במזומן לגזבר.\nלכל שאלה: dan@gmail.com`);
ins.run('gmail_user', process.env.GMAIL_USER || '');
ins.run('gmail_app_password', process.env.GMAIL_APP_PASSWORD || '');
ins.run('admin_email', process.env.ADMIN_EMAIL || '');

// Seed 26 apartments
if (db.prepare('SELECT COUNT(*) as c FROM apartments').get().c === 0) {
  const a = db.prepare('INSERT INTO apartments(id,apt_num,monthly_fee) VALUES(?,?,400)');
  for (let i = 1; i <= 26; i++) a.run(uuid(), String(i));
}

module.exports = db;
