const { ipcMain } = require("electron");
const db = require("../db.cjs");
const { hashPassword, verifyPassword } = require("../auth.cjs");

let currentSession = null;

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function requireAuth() {
  if (!currentSession) {
    throw new Error("Not authenticated");
  }
  return currentSession;
}

function requireAdmin() {
  const session = requireAuth();
  if (session.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}

function registerAuthHandlers() {
  ipcMain.handle("auth:login", async (_, payload) => {
    const username = String(payload?.username || "").trim();
    const password = String(payload?.password || "");

    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
      )
      .get(username);

    if (!user || !user.is_active) {
      throw new Error("Invalid username or password");
    }

    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      throw new Error("Invalid username or password");
    }

    currentSession = sanitizeUser(user);

    return {
      success: true,
      user: currentSession,
    };
  });

  ipcMain.handle("auth:logout", async () => {
    currentSession = null;
    return { success: true };
  });

  ipcMain.handle("auth:get-session", async () => {
    return currentSession;
  });

  ipcMain.handle("users:list", async () => {
    requireAdmin();

    const users = db
      .prepare(
        `
        SELECT id, full_name, username, role, is_active, created_at, updated_at
        FROM users
        ORDER BY id DESC
      `,
      )
      .all();

    return users;
  });

  ipcMain.handle("users:create", async (_, payload) => {
    requireAdmin();

    const fullName = String(payload?.fullName || "").trim();
    const username = String(payload?.username || "").trim();
    const password = String(payload?.password || "");
    const role = String(payload?.role || "").trim();

    if (!fullName || !username || !password || !role) {
      throw new Error("All fields are required");
    }

    if (!["admin", "cashier"].includes(role)) {
      throw new Error("Invalid role");
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE username = ? LIMIT 1")
      .get(username);

    if (existing) {
      throw new Error("Username already exists");
    }

    const passwordHash = hashPassword(password);

    const result = db
      .prepare(
        `
        INSERT INTO users (full_name, username, password_hash, role)
        VALUES (?, ?, ?, ?)
      `,
      )
      .run(fullName, username, passwordHash, role);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("users:update", async (_, payload) => {
    requireAdmin();

    const id = Number(payload?.id);
    const fullName = String(payload?.fullName || "").trim();
    const username = String(payload?.username || "").trim();
    const role = String(payload?.role || "").trim();
    const isActive = Number(payload?.isActive ? 1 : 0);

    if (!id || !fullName || !username || !role) {
      throw new Error("Missing required fields");
    }

    if (!["admin", "cashier"].includes(role)) {
      throw new Error("Invalid role");
    }

    db.prepare(`
      UPDATE users
      SET full_name = ?,
          username = ?,
          role = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fullName, username, role, isActive, id);

    return { success: true };
  });

  ipcMain.handle("users:change-password", async (_, payload) => {
    requireAdmin();

    const id = Number(payload?.id);
    const newPassword = String(payload?.newPassword || "");

    if (!id || !newPassword) {
      throw new Error("User ID and new password are required");
    }

    const passwordHash = hashPassword(newPassword);

    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, id);

    return { success: true };
  });
}

module.exports = {
  registerAuthHandlers,
  requireAuth,
  requireAdmin,
};