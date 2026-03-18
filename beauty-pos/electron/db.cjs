const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");
const { hashPassword } = require("./auth.cjs");

const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "beauty-pos.sqlite");
const migrationsDir = path.join(__dirname, "migrations");

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function getAppliedMigrationNames() {
  const rows = db
    .prepare("SELECT name FROM schema_migrations ORDER BY name ASC")
    .all();

  return new Set(rows.map((row) => row.name));
}

function runMigrations() {
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const applied = getAppliedMigrationNames();

  for (const file of files) {
    if (applied.has(file)) continue;

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`[db] Running migration: ${file}`);

    try {
      const transaction = db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
      });

      transaction();
      console.log(`[db] Applied migration: ${file}`);
    } catch (error) {
      console.error(`[db] Failed migration: ${file}`);
      throw error;
    }
  }
}

function tableExists(tableName) {
  const row = db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
      LIMIT 1
    `,
    )
    .get(tableName);

  return !!row;
}

function ensureDefaultAdmin() {
  if (!tableExists("users")) return;

  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  if (row.count > 0) return;

  const username = "admin";
  const password = "admin123";
  const passwordHash = hashPassword(password);

  db.prepare(
    `
    INSERT INTO users (
      full_name,
      username,
      password_hash,
      role,
      is_active,
      must_change_password
    )
    VALUES (?, ?, ?, ?, 1, 1)
  `,
  ).run("System Admin", username, passwordHash, "admin");

  console.log("[auth] Default admin created");
  console.log("[auth] username: admin");
  console.log("[auth] password: admin123");
  console.log("[auth] Change this password immediately.");
}

runMigrations();
ensureDefaultAdmin();

module.exports = db;
